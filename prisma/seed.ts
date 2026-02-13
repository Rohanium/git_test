import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Users ─────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: "admin@joinery-erp.local",
      name: "James Mitchell",
      passwordHash: "admin123",
      role: "ADMIN",
    },
  });

  const salesRep = await prisma.user.create({
    data: {
      email: "sarah@joinery-erp.local",
      name: "Sarah Thompson",
      passwordHash: "sales123",
      role: "SALES",
    },
  });

  const designer = await prisma.user.create({
    data: {
      email: "mike@joinery-erp.local",
      name: "Mike Chen",
      passwordHash: "design123",
      role: "DESIGNER",
    },
  });

  const workshopMgr = await prisma.user.create({
    data: {
      email: "dave@joinery-erp.local",
      name: "Dave Williams",
      passwordHash: "workshop123",
      role: "WORKSHOP_MANAGER",
    },
  });

  const workshopStaff1 = await prisma.user.create({
    data: {
      email: "tony@joinery-erp.local",
      name: "Tony Brown",
      passwordHash: "staff123",
      role: "WORKSHOP_STAFF",
    },
  });

  const workshopStaff2 = await prisma.user.create({
    data: {
      email: "jake@joinery-erp.local",
      name: "Jake Roberts",
      passwordHash: "staff123",
      role: "WORKSHOP_STAFF",
    },
  });

  const accountant = await prisma.user.create({
    data: {
      email: "lisa@joinery-erp.local",
      name: "Lisa Anderson",
      passwordHash: "accounts123",
      role: "ACCOUNTS",
    },
  });

  const installer = await prisma.user.create({
    data: {
      email: "chris@joinery-erp.local",
      name: "Chris Taylor",
      passwordHash: "install123",
      role: "INSTALLER",
    },
  });

  // ── Employees ─────────────────────────────────────────────
  await prisma.employee.createMany({
    data: [
      { userId: admin.id, employeeNumber: "EMP-001", startDate: new Date("2020-01-15"), position: "Director", department: "Management", salaryAnnual: 120000 },
      { userId: salesRep.id, employeeNumber: "EMP-002", startDate: new Date("2021-03-01"), position: "Sales Manager", department: "Sales", salaryAnnual: 85000 },
      { userId: designer.id, employeeNumber: "EMP-003", startDate: new Date("2021-06-15"), position: "Senior Designer", department: "Design", salaryAnnual: 90000 },
      { userId: workshopMgr.id, employeeNumber: "EMP-004", startDate: new Date("2019-07-01"), position: "Workshop Manager", department: "Production", salaryAnnual: 95000 },
      { userId: workshopStaff1.id, employeeNumber: "EMP-005", startDate: new Date("2022-02-01"), position: "Cabinet Maker", department: "Production", hourlyRate: 38 },
      { userId: workshopStaff2.id, employeeNumber: "EMP-006", startDate: new Date("2023-01-10"), position: "Spray Painter", department: "Production", hourlyRate: 35 },
      { userId: accountant.id, employeeNumber: "EMP-007", startDate: new Date("2022-08-01"), position: "Accounts Manager", department: "Finance", salaryAnnual: 75000 },
      { userId: installer.id, employeeNumber: "EMP-008", startDate: new Date("2021-11-01"), position: "Lead Installer", department: "Installation", hourlyRate: 40 },
    ],
  });

  // ── Employee Skills ───────────────────────────────────────
  const employees = await prisma.employee.findMany();
  const empMap: Record<string, string> = {};
  for (const emp of employees) {
    empMap[emp.userId] = emp.id;
  }

  await prisma.employeeSkill.createMany({
    data: [
      { employeeId: empMap[workshopMgr.id], skillName: "CNC Operation", proficiency: 5 },
      { employeeId: empMap[workshopMgr.id], skillName: "Production Scheduling", proficiency: 5 },
      { employeeId: empMap[workshopStaff1.id], skillName: "CNC Operation", proficiency: 4 },
      { employeeId: empMap[workshopStaff1.id], skillName: "Cabinet Assembly", proficiency: 5 },
      { employeeId: empMap[workshopStaff1.id], skillName: "Edge Banding", proficiency: 4 },
      { employeeId: empMap[workshopStaff2.id], skillName: "Spray Painting", proficiency: 5 },
      { employeeId: empMap[workshopStaff2.id], skillName: "Staining", proficiency: 4 },
      { employeeId: empMap[workshopStaff2.id], skillName: "Hand Finishing", proficiency: 3 },
      { employeeId: empMap[installer.id], skillName: "Kitchen Installation", proficiency: 5 },
      { employeeId: empMap[installer.id], skillName: "Wardrobe Installation", proficiency: 4 },
    ],
  });

  // ── Companies ─────────────────────────────────────────────
  const smithFamily = await prisma.company.create({
    data: {
      name: "Smith Family",
      type: "CUSTOMER",
      phone: "021 555 1234",
      email: "john.smith@email.co.nz",
      addressLine1: "42 Rimu Street",
      city: "Auckland",
      postcode: "1010",
    },
  });

  const brownResidence = await prisma.company.create({
    data: {
      name: "Brown Residence",
      type: "CUSTOMER",
      phone: "027 555 5678",
      email: "emma.brown@email.co.nz",
      addressLine1: "15 Kauri Avenue",
      city: "Wellington",
      postcode: "6011",
    },
  });

  const wilsonCommercial = await prisma.company.create({
    data: {
      name: "Wilson & Partners Law",
      type: "CUSTOMER",
      phone: "09 555 9999",
      email: "office@wilsonlaw.co.nz",
      addressLine1: "Level 12, Commercial Bay",
      city: "Auckland",
      postcode: "1010",
    },
  });

  const architectFirm = await prisma.company.create({
    data: {
      name: "Studio Arch Design",
      type: "ARCHITECT",
      phone: "09 555 3333",
      email: "hello@studioarch.co.nz",
      website: "https://studioarch.co.nz",
      city: "Auckland",
    },
  });

  const builder = await prisma.company.create({
    data: {
      name: "Prestige Homes NZ",
      type: "BUILDER",
      phone: "021 555 4444",
      email: "info@prestigehomes.co.nz",
      city: "Auckland",
    },
  });

  const timberSupplier = await prisma.company.create({
    data: {
      name: "NZ Timber Merchants",
      type: "SUPPLIER",
      phone: "09 555 7777",
      email: "orders@nztimber.co.nz",
      addressLine1: "45 Industrial Drive",
      city: "Auckland",
      postcode: "2013",
    },
  });

  const boardSupplier = await prisma.company.create({
    data: {
      name: "Carter Holt Harvey",
      type: "SUPPLIER",
      phone: "0800 326 483",
      email: "orders@chh.co.nz",
      city: "Auckland",
    },
  });

  const hardwareSupplier = await prisma.company.create({
    data: {
      name: "Hafele NZ",
      type: "SUPPLIER",
      phone: "09 555 8888",
      email: "sales@hafele.co.nz",
      city: "Auckland",
    },
  });

  // ── Suppliers ─────────────────────────────────────────────
  await prisma.supplier.create({
    data: { companyId: timberSupplier.id, paymentTerms: "30 days", leadTimeDays: 5, rating: 4 },
  });
  await prisma.supplier.create({
    data: { companyId: boardSupplier.id, paymentTerms: "20th following", leadTimeDays: 3, rating: 5 },
  });
  await prisma.supplier.create({
    data: { companyId: hardwareSupplier.id, paymentTerms: "30 days", leadTimeDays: 7, rating: 4 },
  });

  // ── Contacts ──────────────────────────────────────────────
  const johnSmith = await prisma.contact.create({
    data: { firstName: "John", lastName: "Smith", email: "john.smith@email.co.nz", phone: "021 555 1234", companyId: smithFamily.id, isPrimary: true },
  });
  const emmaBrown = await prisma.contact.create({
    data: { firstName: "Emma", lastName: "Brown", email: "emma.brown@email.co.nz", phone: "027 555 5678", companyId: brownResidence.id, isPrimary: true },
  });
  const markWilson = await prisma.contact.create({
    data: { firstName: "Mark", lastName: "Wilson", email: "mark@wilsonlaw.co.nz", phone: "09 555 9999", jobTitle: "Managing Partner", companyId: wilsonCommercial.id, isPrimary: true },
  });
  const annaArch = await prisma.contact.create({
    data: { firstName: "Anna", lastName: "Petrova", email: "anna@studioarch.co.nz", phone: "021 555 3333", jobTitle: "Principal Architect", companyId: architectFirm.id, isPrimary: true },
  });
  const tomBuilder = await prisma.contact.create({
    data: { firstName: "Tom", lastName: "Harrison", email: "tom@prestigehomes.co.nz", phone: "021 555 4444", jobTitle: "Project Manager", companyId: builder.id, isPrimary: true },
  });

  // ── Material Categories ───────────────────────────────────
  const boardCat = await prisma.materialCategory.create({ data: { name: "Board Goods", description: "MDF, plywood, particle board, melamine" } });
  const timberCat = await prisma.materialCategory.create({ data: { name: "Solid Timber", description: "Native and exotic timber species" } });
  const hardwareCat = await prisma.materialCategory.create({ data: { name: "Hardware", description: "Hinges, slides, handles, fixings" } });
  const finishCat = await prisma.materialCategory.create({ data: { name: "Finishes", description: "Paint, stains, lacquer, oils" } });
  const benchCat = await prisma.materialCategory.create({ data: { name: "Benchtops", description: "Engineered stone, solid timber, laminate tops" } });

  // ── Materials ─────────────────────────────────────────────
  const mdf18 = await prisma.material.create({
    data: { sku: "BRD-MDF-18", name: "MDF 18mm", description: "Standard MDF 2440x1220x18mm", unit: "sheet", unitCost: 65, categoryId: boardCat.id, minStock: 10, reorderPoint: 15, reorderQty: 30, leadTimeDays: 3 },
  });
  await prisma.material.create({
    data: { sku: "BRD-MDF-16", name: "MDF 16mm", description: "Standard MDF 2440x1220x16mm", unit: "sheet", unitCost: 58, categoryId: boardCat.id, minStock: 5, reorderPoint: 10, reorderQty: 20, leadTimeDays: 3 },
  });
  await prisma.material.create({
    data: { sku: "BRD-PLY-18", name: "Plywood 18mm", description: "AA Grade Plywood 2440x1220x18mm", unit: "sheet", unitCost: 95, categoryId: boardCat.id, minStock: 5, reorderPoint: 8, reorderQty: 15, leadTimeDays: 5 },
  });
  await prisma.material.create({
    data: { sku: "BRD-MEL-WHT-16", name: "White Melamine 16mm", description: "White melamine faced MDF 2440x1220x16mm", unit: "sheet", unitCost: 78, categoryId: boardCat.id, minStock: 8, reorderPoint: 12, reorderQty: 25, leadTimeDays: 3 },
  });
  await prisma.material.create({
    data: { sku: "TIM-OAK-25", name: "American Oak 25mm", description: "Kiln dried American White Oak, random widths", unit: "lm", unitCost: 42, categoryId: timberCat.id, minStock: 20, reorderPoint: 30, reorderQty: 50, leadTimeDays: 10 },
  });
  await prisma.material.create({
    data: { sku: "TIM-WAL-25", name: "American Walnut 25mm", description: "Kiln dried American Black Walnut", unit: "lm", unitCost: 85, categoryId: timberCat.id, reorderPoint: 15, reorderQty: 30, leadTimeDays: 14 },
  });
  await prisma.material.create({
    data: { sku: "HW-HNG-SC", name: "Soft-Close Hinge", description: "Blum 110° soft-close clip-top hinge", unit: "each", unitCost: 8.50, categoryId: hardwareCat.id, minStock: 50, reorderPoint: 80, reorderQty: 200, leadTimeDays: 7 },
  });
  await prisma.material.create({
    data: { sku: "HW-DRW-SC-500", name: "Soft-Close Drawer Runner 500mm", description: "Blum Tandembox 500mm full extension", unit: "pair", unitCost: 45, categoryId: hardwareCat.id, minStock: 20, reorderPoint: 30, reorderQty: 50, leadTimeDays: 7 },
  });
  await prisma.material.create({
    data: { sku: "HW-HDL-BLK-160", name: "Matt Black Handle 160mm", description: "Matt black bar handle 160mm centres", unit: "each", unitCost: 12, categoryId: hardwareCat.id, minStock: 30, reorderPoint: 40, reorderQty: 100, leadTimeDays: 14 },
  });
  await prisma.material.create({
    data: { sku: "FIN-2PK-WHT", name: "2-Pack Paint White", description: "White 2-pack polyurethane paint", unit: "litre", unitCost: 65, categoryId: finishCat.id, minStock: 10, reorderPoint: 15, reorderQty: 30, leadTimeDays: 5 },
  });
  await prisma.material.create({
    data: { sku: "BT-ENG-CW", name: "Engineered Stone - Calacatta White", description: "20mm Caesarstone Calacatta White", unit: "m2", unitCost: 650, categoryId: benchCat.id, leadTimeDays: 14 },
  });

  // ── Stock Items ───────────────────────────────────────────
  await prisma.stockItem.create({
    data: { materialId: mdf18.id, quantity: 22, location: "Rack A1", costPerUnit: 65 },
  });

  // ── Leads ─────────────────────────────────────────────────
  await prisma.lead.create({
    data: {
      title: "Kitchen renovation — Smith residence",
      source: "REFERRAL_ARCHITECT",
      status: "CONVERTED",
      estimatedValue: 45000,
      projectType: "KITCHEN",
      contactId: johnSmith.id,
      companyId: smithFamily.id,
      assignedToId: salesRep.id,
      address: "42 Rimu Street, Auckland",
    },
  });
  await prisma.lead.create({
    data: {
      title: "Master wardrobe — Brown residence",
      source: "REFERRAL_BUILDER",
      status: "QUALIFIED",
      estimatedValue: 18000,
      projectType: "WARDROBE",
      contactId: emmaBrown.id,
      companyId: brownResidence.id,
      assignedToId: salesRep.id,
    },
  });
  await prisma.lead.create({
    data: {
      title: "Office fitout — Wilson & Partners",
      source: "REFERRAL_ARCHITECT",
      status: "QUALIFIED",
      estimatedValue: 120000,
      projectType: "COMMERCIAL_FITOUT",
      contactId: markWilson.id,
      companyId: wilsonCommercial.id,
      assignedToId: salesRep.id,
    },
  });
  await prisma.lead.create({
    data: {
      title: "Bathroom vanity enquiry",
      source: "WEBSITE",
      status: "NEW",
      estimatedValue: 8000,
      projectType: "BATHROOM_VANITY",
    },
  });
  await prisma.lead.create({
    data: {
      title: "Custom dining table",
      source: "SOCIAL_MEDIA",
      status: "CONTACTED",
      estimatedValue: 5500,
      projectType: "CUSTOM_FURNITURE",
    },
  });

  // ── Opportunities ─────────────────────────────────────────
  await prisma.opportunity.create({
    data: {
      title: "Kitchen — Smith Residence",
      stage: "QUOTING",
      estimatedValue: 52000,
      probability: 70,
      projectType: "KITCHEN",
      contactId: johnSmith.id,
      companyId: smithFamily.id,
      ownerId: salesRep.id,
    },
  });
  await prisma.opportunity.create({
    data: {
      title: "Master Wardrobe — Brown",
      stage: "DESIGN",
      estimatedValue: 22000,
      probability: 50,
      projectType: "WARDROBE",
      contactId: emmaBrown.id,
      companyId: brownResidence.id,
      ownerId: salesRep.id,
    },
  });
  await prisma.opportunity.create({
    data: {
      title: "Office Fitout — Wilson & Partners",
      stage: "SITE_MEASURE",
      estimatedValue: 135000,
      probability: 40,
      projectType: "COMMERCIAL_FITOUT",
      contactId: markWilson.id,
      companyId: wilsonCommercial.id,
      ownerId: salesRep.id,
    },
  });
  await prisma.opportunity.create({
    data: {
      title: "Holiday Home Kitchen — via Studio Arch",
      stage: "ENQUIRY",
      estimatedValue: 38000,
      probability: 20,
      projectType: "KITCHEN",
      contactId: annaArch.id,
      companyId: architectFirm.id,
      ownerId: salesRep.id,
    },
  });
  await prisma.opportunity.create({
    data: {
      title: "New Build Joinery — Prestige Homes",
      stage: "NEGOTIATION",
      estimatedValue: 85000,
      probability: 80,
      projectType: "KITCHEN",
      contactId: tomBuilder.id,
      companyId: builder.id,
      ownerId: salesRep.id,
    },
  });

  // ── Workstations ──────────────────────────────────────────
  await prisma.workStation.createMany({
    data: [
      { name: "CNC Router", type: "CNC Machine", location: "Bay 1", capacity: 8 },
      { name: "Panel Saw", type: "Panel Saw", location: "Bay 2", capacity: 8 },
      { name: "Edge Bander", type: "Edge Bander", location: "Bay 2", capacity: 8 },
      { name: "Assembly Bench 1", type: "Assembly Bench", location: "Bay 3", capacity: 8 },
      { name: "Assembly Bench 2", type: "Assembly Bench", location: "Bay 3", capacity: 8 },
      { name: "Spray Booth", type: "Spray Booth", location: "Bay 4", capacity: 6 },
      { name: "Sanding Station", type: "Sanding", location: "Bay 2", capacity: 8 },
    ],
  });

  // ── Quotes ────────────────────────────────────────────────
  const quote1 = await prisma.quote.create({
    data: {
      quoteNumber: "Q-202602-0001",
      title: "Kitchen — Smith Residence",
      status: "SENT",
      companyId: smithFamily.id,
      contactId: johnSmith.id,
      createdById: salesRep.id,
      taxRate: 0.15,
      subtotal: 42500,
      taxAmount: 6375,
      total: 48875,
      validUntil: new Date("2026-03-15"),
      notes: "Full kitchen including island bench, pantry, and appliance housing.",
    },
  });

  await prisma.quoteLineItem.createMany({
    data: [
      { quoteId: quote1.id, sortOrder: 0, productType: "KITCHEN", description: "Base cabinets — 6 units, soft-close drawers", dimensions: "Various widths x 580D x 720H", quantity: 6, materialCost: 3200, labourCost: 4800, hardwareCost: 1200, unitPrice: 1533.33, lineTotal: 9200, finishType: "2-pack paint white" },
      { quoteId: quote1.id, sortOrder: 1, productType: "KITCHEN", description: "Wall cabinets — 4 units", dimensions: "Various widths x 350D x 720H", quantity: 4, materialCost: 1800, labourCost: 2400, hardwareCost: 640, unitPrice: 1210, lineTotal: 4840, finishType: "2-pack paint white" },
      { quoteId: quote1.id, sortOrder: 2, productType: "KITCHEN", description: "Island bench with waterfall ends", dimensions: "2400W x 1000D x 900H", quantity: 1, materialCost: 4500, labourCost: 3500, hardwareCost: 800, unitPrice: 8800, lineTotal: 8800, finishType: "2-pack paint charcoal" },
      { quoteId: quote1.id, sortOrder: 3, productType: "KITCHEN", description: "Walk-in pantry — full height", dimensions: "1800W x 600D x 2400H", quantity: 1, materialCost: 2800, labourCost: 2200, hardwareCost: 960, unitPrice: 5960, lineTotal: 5960, finishType: "White melamine interior" },
      { quoteId: quote1.id, sortOrder: 4, productType: "KITCHEN", description: "Engineered stone benchtop — Calacatta White", dimensions: "6.5 lm including island", quantity: 1, materialCost: 8500, labourCost: 1200, hardwareCost: 0, unitPrice: 9700, lineTotal: 9700, finishType: "Polished" },
      { quoteId: quote1.id, sortOrder: 5, productType: "KITCHEN", description: "Installation & fitting", quantity: 1, materialCost: 0, labourCost: 4000, hardwareCost: 0, unitPrice: 4000, lineTotal: 4000 },
    ],
  });

  const quote2 = await prisma.quote.create({
    data: {
      quoteNumber: "Q-202602-0002",
      title: "New Build Joinery Package — Prestige Homes",
      status: "DRAFT",
      companyId: builder.id,
      contactId: tomBuilder.id,
      createdById: salesRep.id,
      taxRate: 0.15,
      subtotal: 78000,
      taxAmount: 11700,
      total: 89700,
      notes: "Kitchen, laundry, bathroom vanity, and wardrobes for new build.",
    },
  });

  // ── Activities ────────────────────────────────────────────
  await prisma.activity.createMany({
    data: [
      { type: "SITE_VISIT", subject: "Site measure — Smith Kitchen", description: "Measured kitchen space. Existing layout to be demolished. Good access for delivery.", userId: salesRep.id, contactId: johnSmith.id },
      { type: "DESIGN_REVIEW", subject: "Design review with John Smith", description: "Presented initial 3D renders. Customer wants island bench with waterfall stone ends.", userId: designer.id, contactId: johnSmith.id },
      { type: "CALL", subject: "Follow up — Wilson office fitout", description: "Spoke with Mark about timeline. They need completion by end of Q2.", userId: salesRep.id, contactId: markWilson.id },
      { type: "MEETING", subject: "Prestige Homes — New build specification", description: "Met with Tom to discuss joinery package for Remuera new build.", userId: salesRep.id, contactId: tomBuilder.id },
      { type: "EMAIL", subject: "Quote sent — Smith Kitchen", description: "Sent detailed quote Q-202602-0001 for kitchen renovation.", userId: salesRep.id, contactId: johnSmith.id },
    ],
  });

  console.log("Seed complete!");
  console.log("");
  console.log("Demo accounts:");
  console.log("  admin@joinery-erp.local / admin123 (Admin)");
  console.log("  sarah@joinery-erp.local / sales123 (Sales)");
  console.log("  mike@joinery-erp.local  / design123 (Designer)");
  console.log("  dave@joinery-erp.local  / workshop123 (Workshop Manager)");
  console.log("  lisa@joinery-erp.local  / accounts123 (Accounts)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
