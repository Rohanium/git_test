// ── Project Types ────────────────────────────────────────────
export const PROJECT_TYPES = {
  KITCHEN: "Kitchen",
  BATHROOM_VANITY: "Bathroom Vanity",
  WARDROBE: "Wardrobe",
  LAUNDRY: "Laundry",
  STUDY_OFFICE: "Study / Office",
  ENTERTAINMENT_UNIT: "Entertainment Unit",
  BOOKCASE_SHELVING: "Bookcase / Shelving",
  DOORS: "Doors",
  WINDOWS: "Windows",
  STAIRCASE: "Staircase",
  CUSTOM_FURNITURE: "Custom Furniture",
  COMMERCIAL_FITOUT: "Commercial Fitout",
  EXTERIOR_JOINERY: "Exterior Joinery",
  OTHER: "Other",
} as const;

// ── Pipeline Stages ─────────────────────────────────────────
export const PIPELINE_STAGES = [
  { key: "ENQUIRY", label: "Enquiry", color: "#94a3b8" },
  { key: "SITE_MEASURE", label: "Site Measure", color: "#60a5fa" },
  { key: "DESIGN", label: "Design", color: "#a78bfa" },
  { key: "QUOTING", label: "Quoting", color: "#fbbf24" },
  { key: "NEGOTIATION", label: "Negotiation", color: "#fb923c" },
  { key: "WON", label: "Won", color: "#34d399" },
  { key: "LOST", label: "Lost", color: "#f87171" },
] as const;

// ── Job Statuses ────────────────────────────────────────────
export const JOB_STATUSES = {
  PENDING: { label: "Pending", color: "gray" },
  MATERIALS_ORDERED: { label: "Materials Ordered", color: "blue" },
  MATERIALS_RECEIVED: { label: "Materials Received", color: "cyan" },
  READY_TO_START: { label: "Ready to Start", color: "indigo" },
  IN_PROGRESS: { label: "In Progress", color: "yellow" },
  ON_HOLD: { label: "On Hold", color: "orange" },
  QC_PENDING: { label: "QC Pending", color: "purple" },
  QC_PASSED: { label: "QC Passed", color: "emerald" },
  READY_FOR_DELIVERY: { label: "Ready for Delivery", color: "teal" },
  COMPLETED: { label: "Completed", color: "green" },
  CANCELLED: { label: "Cancelled", color: "red" },
} as const;

// ── Workshop Operations ─────────────────────────────────────
export const OPERATIONS = {
  CUTTING: "Cutting",
  CNC_MACHINING: "CNC Machining",
  EDGE_BANDING: "Edge Banding",
  DRILLING: "Drilling",
  ROUTING: "Routing",
  SANDING: "Sanding",
  ASSEMBLY: "Assembly",
  FITTING_HARDWARE: "Fitting Hardware",
  SPRAY_PREP: "Spray Preparation",
  SPRAY_PAINTING: "Spray Painting",
  STAINING: "Staining",
  LACQUERING: "Lacquering",
  HAND_FINISHING: "Hand Finishing",
  GLAZING: "Glazing",
  PACKING: "Packing",
  OTHER: "Other",
} as const;

// ── Material Units ──────────────────────────────────────────
export const MATERIAL_UNITS = [
  { value: "m2", label: "Square Metres (m²)" },
  { value: "lm", label: "Linear Metres (lm)" },
  { value: "each", label: "Each" },
  { value: "sheet", label: "Sheet" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "litre", label: "Litres (L)" },
  { value: "pair", label: "Pair" },
  { value: "set", label: "Set" },
  { value: "pack", label: "Pack" },
] as const;

// ── Default Tax Rate (NZ GST) ───────────────────────────────
export const DEFAULT_TAX_RATE = 0.15;

// ── Default Wastage Factor ──────────────────────────────────
export const DEFAULT_WASTAGE_FACTOR = 1.1; // 10% wastage
