import { PrismaClient, OperationType } from "@prisma/client";

/**
 * Cabinet Vision Import Service
 *
 * Parses CSV exports from Cabinet Vision (joinery/cabinetmaking CAD/CAM software),
 * extracts labour hour budgets per operation type, and saves import records to the
 * database with associated LabourBudget entries.
 *
 * Designed for NZ joinery workshops. Typical kitchen cabinet baseline:
 *   Cutting ~2.0h, CNC ~1.5h, Edge Banding ~1.0h, Drilling ~0.5h,
 *   Assembly ~3.0h, Fitting Hardware ~1.0h, Finishing ~2.0h  =>  ~11h total
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single part row parsed from a Cabinet Vision CSV export. */
export interface CVPart {
  roomName: string;
  cabinetName: string;
  partName: string;
  width: number;    // mm
  height: number;   // mm
  depth: number;    // mm
  material: string;
  quantity: number;
  area: number;     // m2
  /** Raw labour-hour values keyed by the CSV column header they came from. */
  labourHours: Partial<Record<CVLabourColumn, number>>;
  /** Hardware items attached to this part/cabinet. */
  hardwareItems: CVHardwareItem[];
}

/** Column names that Cabinet Vision uses for labour / operation hours. */
export type CVLabourColumn =
  | "Cutting"
  | "CNC"
  | "EdgeBanding"
  | "Drilling"
  | "Routing"
  | "Sanding"
  | "Assembly"
  | "FittingHardware"
  | "SprayPrep"
  | "SprayPainting"
  | "Staining"
  | "Lacquering"
  | "HandFinishing"
  | "Glazing"
  | "Packing"
  | "Other";

export interface CVHardwareItem {
  name: string;
  quantity: number;
  unitCost?: number;
}

export interface ParsedCVData {
  parts: CVPart[];
  /** Distinct room/job names found in the file. */
  rooms: string[];
  /** Distinct material names found in the file. */
  materials: string[];
  /** Column headers as they appeared in the original CSV. */
  headers: string[];
  parseWarnings: string[];
}

export interface LabourBudgetEntry {
  operationType: OperationType;
  estimatedHours: number;
  partCount: number;
  complexity: "simple" | "standard" | "complex";
  notes?: string;
}

export interface MaterialSummary {
  material: string;
  totalArea: number;   // m2
  partCount: number;
}

export interface HardwareSummary {
  name: string;
  totalQuantity: number;
  estimatedCost: number;
}

export interface ImportTotals {
  totalParts: number;
  totalLabourHours: number;
  labourByOperation: Record<string, number>;
  materialSummary: MaterialSummary[];
  hardwareSummary: HardwareSummary[];
}

export interface ImportResult {
  importId: string;
  status: "COMPLETED" | "FAILED";
  fileName: string;
  totals: ImportTotals;
  labourBudgets: LabourBudgetEntry[];
  warnings: string[];
  errorLog?: string;
}

export interface LabourEstimate {
  operationBreakdown: Record<OperationType, number>;
  totalHours: number;
  productType: string;
  complexity: "simple" | "standard" | "complex";
  notes: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maps Cabinet Vision CSV column names (normalised to lower-case, no spaces)
 * to the Prisma OperationType enum.
 */
const CV_COLUMN_TO_OPERATION: Record<string, OperationType> = {
  cutting: OperationType.CUTTING,
  cut: OperationType.CUTTING,
  cnc: OperationType.CNC_MACHINING,
  cncmachining: OperationType.CNC_MACHINING,
  cnc_machining: OperationType.CNC_MACHINING,
  edgebanding: OperationType.EDGE_BANDING,
  edge_banding: OperationType.EDGE_BANDING,
  edgeband: OperationType.EDGE_BANDING,
  drilling: OperationType.DRILLING,
  drill: OperationType.DRILLING,
  routing: OperationType.ROUTING,
  route: OperationType.ROUTING,
  sanding: OperationType.SANDING,
  sand: OperationType.SANDING,
  assembly: OperationType.ASSEMBLY,
  assemble: OperationType.ASSEMBLY,
  fittinghardware: OperationType.FITTING_HARDWARE,
  fitting_hardware: OperationType.FITTING_HARDWARE,
  hardware: OperationType.FITTING_HARDWARE,
  sprayprep: OperationType.SPRAY_PREP,
  spray_prep: OperationType.SPRAY_PREP,
  spraypainting: OperationType.SPRAY_PAINTING,
  spray_painting: OperationType.SPRAY_PAINTING,
  spraypaint: OperationType.SPRAY_PAINTING,
  staining: OperationType.STAINING,
  stain: OperationType.STAINING,
  lacquering: OperationType.LACQUERING,
  lacquer: OperationType.LACQUERING,
  handfinishing: OperationType.HAND_FINISHING,
  hand_finishing: OperationType.HAND_FINISHING,
  glazing: OperationType.GLAZING,
  glaze: OperationType.GLAZING,
  packing: OperationType.PACKING,
  pack: OperationType.PACKING,
  other: OperationType.OTHER,
};

/** Complexity multipliers applied to base hours. */
const COMPLEXITY_MULTIPLIERS: Record<string, number> = {
  simple: 0.75,
  standard: 1.0,
  complex: 1.4,
};

/**
 * Base labour-hour profiles per product type, per cabinet unit.
 * These are realistic NZ workshop averages calibrated so a standard kitchen
 * cabinet sums to roughly 11 hours.
 */
const BASE_HOURS_BY_PRODUCT: Record<string, Partial<Record<OperationType, number>>> = {
  kitchen: {
    [OperationType.CUTTING]: 2.0,
    [OperationType.CNC_MACHINING]: 1.5,
    [OperationType.EDGE_BANDING]: 1.0,
    [OperationType.DRILLING]: 0.5,
    [OperationType.SANDING]: 0.5,
    [OperationType.ASSEMBLY]: 3.0,
    [OperationType.FITTING_HARDWARE]: 1.0,
    [OperationType.SPRAY_PREP]: 0.5,
    [OperationType.SPRAY_PAINTING]: 1.0,
    [OperationType.PACKING]: 0.5,
  },
  vanity: {
    [OperationType.CUTTING]: 1.5,
    [OperationType.CNC_MACHINING]: 1.0,
    [OperationType.EDGE_BANDING]: 0.75,
    [OperationType.DRILLING]: 0.5,
    [OperationType.SANDING]: 0.5,
    [OperationType.ASSEMBLY]: 2.0,
    [OperationType.FITTING_HARDWARE]: 0.75,
    [OperationType.SPRAY_PREP]: 0.5,
    [OperationType.SPRAY_PAINTING]: 1.0,
    [OperationType.PACKING]: 0.25,
  },
  wardrobe: {
    [OperationType.CUTTING]: 2.5,
    [OperationType.CNC_MACHINING]: 1.0,
    [OperationType.EDGE_BANDING]: 1.25,
    [OperationType.DRILLING]: 1.0,
    [OperationType.SANDING]: 0.5,
    [OperationType.ASSEMBLY]: 3.5,
    [OperationType.FITTING_HARDWARE]: 1.5,
    [OperationType.SPRAY_PREP]: 0.25,
    [OperationType.SPRAY_PAINTING]: 0.5,
    [OperationType.PACKING]: 0.5,
  },
  laundry: {
    [OperationType.CUTTING]: 1.5,
    [OperationType.CNC_MACHINING]: 0.75,
    [OperationType.EDGE_BANDING]: 0.75,
    [OperationType.DRILLING]: 0.5,
    [OperationType.SANDING]: 0.25,
    [OperationType.ASSEMBLY]: 2.0,
    [OperationType.FITTING_HARDWARE]: 0.75,
    [OperationType.SPRAY_PREP]: 0.25,
    [OperationType.SPRAY_PAINTING]: 0.75,
    [OperationType.PACKING]: 0.25,
  },
  entertainment: {
    [OperationType.CUTTING]: 2.0,
    [OperationType.CNC_MACHINING]: 1.5,
    [OperationType.EDGE_BANDING]: 1.0,
    [OperationType.DRILLING]: 0.75,
    [OperationType.ROUTING]: 0.5,
    [OperationType.SANDING]: 0.75,
    [OperationType.ASSEMBLY]: 3.0,
    [OperationType.FITTING_HARDWARE]: 1.0,
    [OperationType.SPRAY_PREP]: 0.5,
    [OperationType.SPRAY_PAINTING]: 1.25,
    [OperationType.PACKING]: 0.5,
  },
  study: {
    [OperationType.CUTTING]: 1.75,
    [OperationType.CNC_MACHINING]: 1.0,
    [OperationType.EDGE_BANDING]: 0.75,
    [OperationType.DRILLING]: 0.75,
    [OperationType.SANDING]: 0.5,
    [OperationType.ASSEMBLY]: 2.5,
    [OperationType.FITTING_HARDWARE]: 0.75,
    [OperationType.SPRAY_PREP]: 0.25,
    [OperationType.SPRAY_PAINTING]: 0.75,
    [OperationType.PACKING]: 0.25,
  },
  bookcase: {
    [OperationType.CUTTING]: 1.5,
    [OperationType.CNC_MACHINING]: 0.5,
    [OperationType.EDGE_BANDING]: 1.0,
    [OperationType.DRILLING]: 1.0,
    [OperationType.SANDING]: 0.5,
    [OperationType.ASSEMBLY]: 2.0,
    [OperationType.FITTING_HARDWARE]: 0.25,
    [OperationType.SPRAY_PREP]: 0.25,
    [OperationType.SPRAY_PAINTING]: 0.75,
    [OperationType.PACKING]: 0.25,
  },
  commercial: {
    [OperationType.CUTTING]: 2.5,
    [OperationType.CNC_MACHINING]: 2.0,
    [OperationType.EDGE_BANDING]: 1.5,
    [OperationType.DRILLING]: 0.75,
    [OperationType.ROUTING]: 0.5,
    [OperationType.SANDING]: 0.75,
    [OperationType.ASSEMBLY]: 3.5,
    [OperationType.FITTING_HARDWARE]: 1.5,
    [OperationType.SPRAY_PREP]: 0.75,
    [OperationType.SPRAY_PAINTING]: 1.5,
    [OperationType.PACKING]: 0.5,
  },
  custom: {
    [OperationType.CUTTING]: 2.0,
    [OperationType.CNC_MACHINING]: 1.5,
    [OperationType.EDGE_BANDING]: 1.0,
    [OperationType.DRILLING]: 0.5,
    [OperationType.ROUTING]: 0.5,
    [OperationType.SANDING]: 0.75,
    [OperationType.ASSEMBLY]: 3.0,
    [OperationType.FITTING_HARDWARE]: 1.0,
    [OperationType.HAND_FINISHING]: 1.0,
    [OperationType.SPRAY_PREP]: 0.5,
    [OperationType.SPRAY_PAINTING]: 1.25,
    [OperationType.PACKING]: 0.5,
  },
};

/**
 * Normalised product-type aliases so callers can pass friendly names like
 * "bathroom_vanity" or "KITCHEN" and still match a profile.
 */
const PRODUCT_TYPE_ALIASES: Record<string, string> = {
  kitchen: "kitchen",
  vanity: "vanity",
  bathroom: "vanity",
  bathroom_vanity: "vanity",
  wardrobe: "wardrobe",
  robe: "wardrobe",
  laundry: "laundry",
  entertainment: "entertainment",
  entertainment_unit: "entertainment",
  tv_unit: "entertainment",
  study: "study",
  office: "study",
  study_office: "study",
  bookcase: "bookcase",
  bookcase_shelving: "bookcase",
  shelving: "bookcase",
  commercial: "commercial",
  commercial_fitout: "commercial",
  custom: "custom",
  custom_furniture: "custom",
  other: "custom",
  doors: "custom",
  windows: "custom",
  staircase: "custom",
  exterior_joinery: "custom",
};

// ---------------------------------------------------------------------------
// CSV Parsing Helpers
// ---------------------------------------------------------------------------

/**
 * Splits a single CSV line respecting quoted fields that may contain commas
 * or newlines. Returns an array of field values with surrounding quotes and
 * whitespace trimmed.
 */
function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Look-ahead for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Normalise a header string for lookup: lower-case, strip spaces / underscores /
 * hyphens, so "Edge Banding", "edge-banding" and "EdgeBanding" all resolve the
 * same way.
 */
function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[\s_\-]/g, "");
}

/**
 * Try to map a CSV column header to an OperationType. Returns undefined when
 * the header does not correspond to any known operation.
 */
function headerToOperationType(header: string): OperationType | undefined {
  return CV_COLUMN_TO_OPERATION[normaliseHeader(header)];
}

/** Parse a numeric value from a CSV cell, returning 0 for blanks / non-numbers. */
function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Core: parseCabinetVisionCSV
// ---------------------------------------------------------------------------

/**
 * Parse raw Cabinet Vision CSV content into structured part data.
 *
 * Expected CSV layout (column order may vary):
 *   Room/Job Name, Cabinet Name, Part Name, Width, Height, Depth, Material,
 *   Qty, Area, Cutting, CNC, EdgeBanding, Drilling, ... , Hardware
 *
 * The parser auto-detects columns by matching header names.
 */
export function parseCabinetVisionCSV(csvContent: string): ParsedCVData {
  const warnings: string[] = [];
  const lines = csvContent
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      parts: [],
      rooms: [],
      materials: [],
      headers: [],
      parseWarnings: ["CSV file is empty or contains only a header row."],
    };
  }

  // --- Header detection ---
  const rawHeaders = splitCSVLine(lines[0]);
  const headers = rawHeaders.map((h) => h.trim());
  const normHeaders = headers.map(normaliseHeader);

  // Build column index map for well-known fields
  const colIndex = (candidates: string[]): number => {
    for (const c of candidates) {
      const idx = normHeaders.indexOf(normaliseHeader(c));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const iRoom = colIndex(["Room Name", "Room", "Job Name", "Room/Job Name", "RoomName", "JobName"]);
  const iCabinet = colIndex(["Cabinet Name", "Cabinet", "CabinetName", "Unit Name", "UnitName"]);
  const iPart = colIndex(["Part Name", "Part", "PartName", "Component", "ComponentName"]);
  const iWidth = colIndex(["Width", "W"]);
  const iHeight = colIndex(["Height", "H"]);
  const iDepth = colIndex(["Depth", "D", "Length", "L"]);
  const iMaterial = colIndex(["Material", "MaterialName", "Board", "BoardName"]);
  const iQty = colIndex(["Qty", "Quantity", "Qty Required", "Count"]);
  const iArea = colIndex(["Area", "Area (m2)", "Area(m2)", "Sheet Area"]);
  const iHardware = colIndex(["Hardware", "HardwareItems", "Hardware Items", "Fittings"]);

  // Detect labour/operation columns (anything that maps to an OperationType)
  const operationCols: { index: number; header: string; opType: OperationType }[] = [];
  for (let i = 0; i < headers.length; i++) {
    const opType = headerToOperationType(headers[i]);
    if (opType) {
      operationCols.push({ index: i, header: headers[i], opType });
    }
  }

  if (iRoom === -1 && iCabinet === -1 && iPart === -1) {
    warnings.push(
      "Could not detect standard Cabinet Vision columns (Room Name, Cabinet Name, Part Name). " +
      "Parsing will proceed using positional fallback."
    );
  }

  // --- Row parsing ---
  const parts: CVPart[] = [];
  const roomSet = new Set<string>();
  const materialSet = new Set<string>();

  for (let row = 1; row < lines.length; row++) {
    const fields = splitCSVLine(lines[row]);
    if (fields.length < 3) {
      warnings.push(`Row ${row + 1}: skipped — fewer than 3 fields.`);
      continue;
    }

    const roomName = iRoom >= 0 ? (fields[iRoom] ?? "").trim() : "";
    const cabinetName = iCabinet >= 0 ? (fields[iCabinet] ?? "").trim() : "";
    const partName = iPart >= 0 ? (fields[iPart] ?? "").trim() : (fields[0] ?? "").trim();
    const width = parseNumber(iWidth >= 0 ? fields[iWidth] : undefined);
    const height = parseNumber(iHeight >= 0 ? fields[iHeight] : undefined);
    const depth = parseNumber(iDepth >= 0 ? fields[iDepth] : undefined);
    const material = iMaterial >= 0 ? (fields[iMaterial] ?? "").trim() : "";
    const quantity = Math.max(1, Math.round(parseNumber(iQty >= 0 ? fields[iQty] : undefined)) || 1);
    const area = parseNumber(iArea >= 0 ? fields[iArea] : undefined);

    // Labour hours from operation columns
    const labourHours: Partial<Record<CVLabourColumn, number>> = {};
    for (const oc of operationCols) {
      const val = parseNumber(fields[oc.index]);
      if (val > 0) {
        labourHours[oc.header as CVLabourColumn] = val;
      }
    }

    // Hardware items (semicolon-separated list: "Blum Hinge x2; Drawer Runner x1")
    const hardwareItems: CVHardwareItem[] = [];
    if (iHardware >= 0 && fields[iHardware]) {
      const hwRaw = fields[iHardware].trim();
      if (hwRaw.length > 0) {
        const hwParts = hwRaw.split(";").map((s) => s.trim()).filter(Boolean);
        for (const hwp of hwParts) {
          const match = hwp.match(/^(.+?)\s*[xX×]\s*(\d+)(?:\s*@\s*\$?([\d.]+))?$/);
          if (match) {
            hardwareItems.push({
              name: match[1].trim(),
              quantity: parseInt(match[2], 10),
              unitCost: match[3] ? parseFloat(match[3]) : undefined,
            });
          } else {
            hardwareItems.push({ name: hwp, quantity: 1 });
          }
        }
      }
    }

    if (roomName) roomSet.add(roomName);
    if (material) materialSet.add(material);

    parts.push({
      roomName,
      cabinetName,
      partName,
      width,
      height,
      depth,
      material,
      quantity,
      area,
      labourHours,
      hardwareItems,
    });
  }

  return {
    parts,
    rooms: Array.from(roomSet),
    materials: Array.from(materialSet),
    headers,
    parseWarnings: warnings,
  };
}

// ---------------------------------------------------------------------------
// Core: extractLabourBudgets
// ---------------------------------------------------------------------------

/**
 * Aggregate parsed CV data into a list of LabourBudgetEntry records, one per
 * distinct OperationType found. Applies complexity factors based on the size
 * and count of parts.
 */
export function extractLabourBudgets(parsed: ParsedCVData): LabourBudgetEntry[] {
  // Accumulate raw hours and part counts per operation type
  const accumulator: Record<string, { hours: number; partCount: number }> = {};
  const allOps = Object.values(OperationType);
  for (const op of allOps) {
    accumulator[op] = { hours: 0, partCount: 0 };
  }

  for (const part of parsed.parts) {
    for (const [colName, hours] of Object.entries(part.labourHours)) {
      const opType = headerToOperationType(colName);
      if (opType && hours > 0) {
        accumulator[opType].hours += hours * part.quantity;
        accumulator[opType].partCount += part.quantity;
      }
    }
  }

  // Determine overall complexity from part dimensions and count.
  const complexity = inferComplexity(parsed.parts);
  const multiplier = COMPLEXITY_MULTIPLIERS[complexity] ?? 1.0;

  const budgets: LabourBudgetEntry[] = [];
  for (const op of allOps) {
    const acc = accumulator[op];
    if (acc.hours > 0) {
      budgets.push({
        operationType: op,
        estimatedHours: roundTo(acc.hours * multiplier, 2),
        partCount: acc.partCount,
        complexity,
        notes: multiplier !== 1.0
          ? `Base hours ${roundTo(acc.hours, 2)}h adjusted by ${complexity} factor (×${multiplier})`
          : undefined,
      });
    }
  }

  return budgets;
}

// ---------------------------------------------------------------------------
// Core: importCabinetVisionFile
// ---------------------------------------------------------------------------

/**
 * Full import workflow:
 *  1. Parse the CSV
 *  2. Extract labour budgets
 *  3. Calculate totals (parts, hours, materials, hardware)
 *  4. Persist a CabinetVisionImport record + LabourBudget rows via Prisma
 *  5. Optionally link to a Project and/or Job
 */
export async function importCabinetVisionFile(
  db: PrismaClient,
  params: {
    csvContent: string;
    fileName: string;
    projectId?: string;
    jobId?: string;
  }
): Promise<ImportResult> {
  const { csvContent, fileName, projectId, jobId } = params;

  // 1. Parse
  const parsed = parseCabinetVisionCSV(csvContent);
  const warnings = [...parsed.parseWarnings];

  if (parsed.parts.length === 0) {
    // Persist a FAILED import record so there is an audit trail
    const failedImport = await db.cabinetVisionImport.create({
      data: {
        fileName,
        fileType: "csv",
        status: "FAILED",
        errorLog: "No parts could be parsed from the CSV file.",
        projectId: projectId ?? null,
      },
    });

    return {
      importId: failedImport.id,
      status: "FAILED",
      fileName,
      totals: emptyTotals(),
      labourBudgets: [],
      warnings,
      errorLog: "No parts could be parsed from the CSV file.",
    };
  }

  // 2. Extract labour budgets
  const labourBudgets = extractLabourBudgets(parsed);

  // 3. Calculate totals
  const totals = calculateTotals(parsed, labourBudgets);

  // 4. Persist
  try {
    const cvImport = await db.cabinetVisionImport.create({
      data: {
        fileName,
        fileType: "csv",
        status: "COMPLETED",
        rawData: JSON.parse(JSON.stringify(parsed.parts)),
        summary: JSON.parse(JSON.stringify(totals)),
        projectId: projectId ?? null,
        labourBudgets: {
          create: labourBudgets.map((lb) => ({
            operationType: lb.operationType,
            estimatedHours: lb.estimatedHours,
            complexity: lb.complexity,
            partCount: lb.partCount,
            notes: lb.notes ?? null,
            jobId: jobId ?? null,
          })),
        },
      },
    });

    // If a jobId was supplied, also update the job's estimatedHours with the
    // grand total so production scheduling picks it up.
    if (jobId) {
      await db.job.update({
        where: { id: jobId },
        data: {
          estimatedHours: totals.totalLabourHours,
          labourHours: totals.totalLabourHours,
        },
      });
    }

    return {
      importId: cvImport.id,
      status: "COMPLETED",
      fileName,
      totals,
      labourBudgets,
      warnings,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Attempt to save a FAILED record for audit
    let importId = "unknown";
    try {
      const failedImport = await db.cabinetVisionImport.create({
        data: {
          fileName,
          fileType: "csv",
          status: "FAILED",
          errorLog: errorMessage,
          projectId: projectId ?? null,
        },
      });
      importId = failedImport.id;
    } catch {
      // If even the failure record cannot be saved, surface the original error
    }

    return {
      importId,
      status: "FAILED",
      fileName,
      totals: emptyTotals(),
      labourBudgets: [],
      warnings,
      errorLog: errorMessage,
    };
  }
}

// ---------------------------------------------------------------------------
// Core: estimateLabourHoursFromDimensions
// ---------------------------------------------------------------------------

/**
 * Fallback estimator when no Cabinet Vision file is available. Derives labour
 * hours from overall cabinet dimensions and product type using NZ workshop
 * benchmarks.
 *
 * The dimension-based scaling works as follows:
 *  - A "reference" cabinet is 600W × 720H × 560D (standard kitchen base unit).
 *  - A volume ratio is computed relative to this reference.
 *  - Base hours for each operation are scaled by the cube-root of the volume
 *    ratio (so doubling volume adds ~26% labour, not 100%).
 *  - A complexity factor is applied on top.
 *
 * @param width  Cabinet width in mm
 * @param height Cabinet height in mm
 * @param depth  Cabinet depth in mm
 * @param productType Friendly product name — "kitchen", "vanity", "wardrobe", etc.
 */
export function estimateLabourHoursFromDimensions(
  width: number,
  height: number,
  depth: number,
  productType: string
): LabourEstimate {
  // Resolve product type alias
  const normType = productType.toLowerCase().replace(/[\s\-]/g, "_");
  const profileKey = PRODUCT_TYPE_ALIASES[normType] ?? "custom";
  const baseProfile = BASE_HOURS_BY_PRODUCT[profileKey] ?? BASE_HOURS_BY_PRODUCT["custom"];

  // Reference cabinet: 600W × 720H × 560D mm  (standard NZ kitchen base unit)
  const refVolume = 600 * 720 * 560;
  const actualVolume = Math.max(width, 1) * Math.max(height, 1) * Math.max(depth, 1);
  const volumeRatio = actualVolume / refVolume;

  // Use cube-root scaling — a larger cabinet means more cutting, more edge tape,
  // more assembly time, but not linearly proportional to volume.
  const scaleFactor = Math.cbrt(volumeRatio);

  // Infer complexity from size thresholds
  const complexity = inferComplexityFromDimensions(width, height, depth);
  const multiplier = COMPLEXITY_MULTIPLIERS[complexity] ?? 1.0;

  const breakdown: Record<OperationType, number> = {} as Record<OperationType, number>;
  let total = 0;

  for (const op of Object.values(OperationType)) {
    const base = baseProfile[op] ?? 0;
    const adjusted = roundTo(base * scaleFactor * multiplier, 2);
    breakdown[op] = adjusted;
    total += adjusted;
  }

  total = roundTo(total, 2);

  const notes = [
    `Estimated from dimensions ${width}W × ${height}H × ${depth}D mm.`,
    `Product type: ${profileKey}. Complexity: ${complexity} (×${multiplier}).`,
    `Volume scale factor: ${roundTo(scaleFactor, 3)} (relative to 600×720×560 reference).`,
  ].join(" ");

  return {
    operationBreakdown: breakdown,
    totalHours: total,
    productType: profileKey,
    complexity,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Infer complexity from the parsed part list. Heuristics:
 *  - > 80 parts or any dimension > 2700mm => complex
 *  - < 15 parts and all dims < 1200mm     => simple
 *  - otherwise                             => standard
 */
function inferComplexity(parts: CVPart[]): "simple" | "standard" | "complex" {
  const totalParts = parts.reduce((sum, p) => sum + p.quantity, 0);
  const maxDim = parts.reduce(
    (m, p) => Math.max(m, p.width, p.height, p.depth),
    0
  );

  if (totalParts > 80 || maxDim > 2700) return "complex";
  if (totalParts < 15 && maxDim < 1200) return "simple";
  return "standard";
}

/**
 * Infer complexity from a single cabinet's dimensions.
 *  - Any dimension > 2400mm => complex  (tall pantry, full-height wardrobe, etc.)
 *  - All dimensions < 600mm => simple   (small drawer unit, etc.)
 *  - otherwise              => standard
 */
function inferComplexityFromDimensions(
  width: number,
  height: number,
  depth: number
): "simple" | "standard" | "complex" {
  const maxDim = Math.max(width, height, depth);
  const minDim = Math.min(width, height, depth);

  if (maxDim > 2400) return "complex";
  if (maxDim < 600 && minDim < 400) return "simple";
  return "standard";
}

/** Round a number to a specified number of decimal places. */
function roundTo(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

/** Build totals summary from parsed data and labour budgets. */
function calculateTotals(
  parsed: ParsedCVData,
  labourBudgets: LabourBudgetEntry[]
): ImportTotals {
  const totalParts = parsed.parts.reduce((sum, p) => sum + p.quantity, 0);
  const totalLabourHours = roundTo(
    labourBudgets.reduce((sum, lb) => sum + lb.estimatedHours, 0),
    2
  );

  const labourByOperation: Record<string, number> = {};
  for (const lb of labourBudgets) {
    labourByOperation[lb.operationType] = lb.estimatedHours;
  }

  // Material summary — aggregate area and part count per material name
  const matMap = new Map<string, { totalArea: number; partCount: number }>();
  for (const part of parsed.parts) {
    if (!part.material) continue;
    const existing = matMap.get(part.material) ?? { totalArea: 0, partCount: 0 };
    existing.totalArea = roundTo(existing.totalArea + part.area * part.quantity, 3);
    existing.partCount += part.quantity;
    matMap.set(part.material, existing);
  }
  const materialSummary: MaterialSummary[] = Array.from(matMap.entries()).map(
    ([material, data]) => ({
      material,
      totalArea: data.totalArea,
      partCount: data.partCount,
    })
  );

  // Hardware summary — aggregate across all parts
  const hwMap = new Map<string, { totalQuantity: number; estimatedCost: number }>();
  for (const part of parsed.parts) {
    for (const hw of part.hardwareItems) {
      const existing = hwMap.get(hw.name) ?? { totalQuantity: 0, estimatedCost: 0 };
      existing.totalQuantity += hw.quantity * part.quantity;
      existing.estimatedCost = roundTo(
        existing.estimatedCost + (hw.unitCost ?? 0) * hw.quantity * part.quantity,
        2
      );
      hwMap.set(hw.name, existing);
    }
  }
  const hardwareSummary: HardwareSummary[] = Array.from(hwMap.entries()).map(
    ([name, data]) => ({
      name,
      totalQuantity: data.totalQuantity,
      estimatedCost: data.estimatedCost,
    })
  );

  return {
    totalParts,
    totalLabourHours,
    labourByOperation,
    materialSummary,
    hardwareSummary,
  };
}

/** Returns a zeroed-out ImportTotals (used for failed imports). */
function emptyTotals(): ImportTotals {
  return {
    totalParts: 0,
    totalLabourHours: 0,
    labourByOperation: {},
    materialSummary: [],
    hardwareSummary: [],
  };
}
