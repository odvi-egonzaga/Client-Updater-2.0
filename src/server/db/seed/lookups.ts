import { db } from "@/server/db";
import {
  companies,
  pensionTypes,
  pensionerTypes,
  accountTypes,
  parStatuses,
  statusTypes,
  statusReasons,
  products,
} from "@/server/db/schema";

export async function seedLookups() {
  console.log("Seeding lookup tables...");

  // Companies - use onConflictDoNothing to handle existing data
  const insertedCompanies = await db
    .insert(companies)
    .values([
      { code: "FCASH", name: "FCASH", isSystem: true },
      { code: "PCNI", name: "PCNI", isSystem: true },
    ])
    .onConflictDoNothing()
    .returning();

  console.log("  - Companies seeded");

  // Get company IDs (either from insert or from existing data)
  let fcashId = insertedCompanies.find((c) => c.code === "FCASH")?.id;
  let pcniId = insertedCompanies.find((c) => c.code === "PCNI")?.id;

  if (!fcashId || !pcniId) {
    // Fetch existing companies if insert didn't return them
    const existingCompanies = await db.select().from(companies);
    fcashId = existingCompanies.find((c) => c.code === "FCASH")?.id;
    pcniId = existingCompanies.find((c) => c.code === "PCNI")?.id;
  }

  // Pension Types
  const pensionTypesData = [
    { code: "SSS", name: "SSS", companyId: fcashId, isSystem: true },
    { code: "GSIS", name: "GSIS", companyId: fcashId, isSystem: true },
    { code: "PVAO", name: "PVAO", companyId: fcashId, isSystem: true },
    { code: "NON_PNP", name: "Non-PNP", companyId: pcniId, isSystem: true },
    { code: "PNP", name: "PNP", companyId: pcniId, isSystem: true },
  ];
  await db.insert(pensionTypes).values(pensionTypesData).onConflictDoNothing();
  console.log("  - Pension Types seeded");

  // Pensioner Types
  const pensionerTypesData = [
    { code: "DEPENDENT", name: "Dependent", isSystem: true },
    { code: "DISABILITY", name: "Disability", isSystem: true },
    { code: "RETIREE", name: "Retiree", isSystem: true },
    { code: "ITF", name: "ITF", isSystem: true },
  ];
  await db.insert(pensionerTypes).values(pensionerTypesData).onConflictDoNothing();
  console.log("  - Pensioner Types seeded");

  // Account Types
  const accountTypesData = [
    { code: "PASSBOOK", name: "Passbook", isSystem: true, sortOrder: 1 },
    { code: "ATM", name: "ATM", isSystem: true, sortOrder: 2 },
    { code: "BOTH", name: "Both", isSystem: true, sortOrder: 3 },
    { code: "NONE", name: "None", isSystem: true, sortOrder: 4 },
  ];
  await db.insert(accountTypes).values(accountTypesData).onConflictDoNothing();
  console.log("  - Account Types seeded");

  // PAR Statuses
  const parStatusesData = [
    {
      code: "do_not_show",
      name: "Current",
      isTrackable: true,
      isSystem: true,
      sortOrder: 1,
    },
    {
      code: "tele_130",
      name: "30+ Days",
      isTrackable: true,
      isSystem: true,
      sortOrder: 2,
    },
    {
      code: "tele_hardcore",
      name: "60+ Days",
      isTrackable: false,
      isSystem: true,
      sortOrder: 3,
    },
  ];
  await db.insert(parStatuses).values(parStatusesData).onConflictDoNothing();
  console.log("  - PAR Statuses seeded");

  // Status Types
  const statusTypesData = [
    { code: "PENDING", name: "Pending", sequence: 1, isSystem: true },
    { code: "TO_FOLLOW", name: "To Follow", sequence: 2, isSystem: true },
    { code: "CALLED", name: "Called", sequence: 3, isSystem: true },
    {
      code: "VISITED",
      name: "Visited",
      sequence: 4,
      companyId: fcashId,
      isSystem: true,
    },
    { code: "UPDATED", name: "Updated", sequence: 5, isSystem: true },
    { code: "DONE", name: "Done", sequence: 6, isSystem: true },
  ];
  const insertedStatusTypes = await db
    .insert(statusTypes)
    .values(statusTypesData)
    .onConflictDoNothing()
    .returning();
  console.log("  - Status Types seeded");

  // Status Reasons
  const doneStatus = insertedStatusTypes.find((s) => s.code === "DONE");
  const doneStatusId = doneStatus?.id;

  const statusReasonsData = doneStatusId
    ? [
        {
          code: "DECEASED",
          name: "Deceased",
          statusTypeId: doneStatusId,
          isTerminal: true,
          isSystem: true,
        },
        {
          code: "FULLY_PAID",
          name: "Fully Paid",
          statusTypeId: doneStatusId,
          isTerminal: true,
          isSystem: true,
        },
        {
          code: "CONFIRMED",
          name: "Confirmed",
          statusTypeId: doneStatusId,
          isTerminal: false,
          isSystem: true,
        },
        {
          code: "NOT_REACHABLE",
          name: "Not Reachable",
          statusTypeId: doneStatusId,
          requiresRemarks: true,
          isSystem: true,
        },
      ]
    : [];

  if (statusReasonsData.length > 0) {
    await db.insert(statusReasons).values(statusReasonsData).onConflictDoNothing();
    console.log("  - Status Reasons seeded");
  }

  // Products
  const productsData = fcashId && pcniId
    ? [
        {
          code: "FCASH_SSS",
          name: "FCASH SSS",
          companyId: fcashId,
          trackingCycle: "monthly" as const,
          isSystem: true,
        },
        {
          code: "FCASH_GSIS",
          name: "FCASH GSIS",
          companyId: fcashId,
          trackingCycle: "monthly" as const,
          isSystem: true,
        },
        {
          code: "PCNI_NON_PNP",
          name: "PCNI Non-PNP",
          companyId: pcniId,
          trackingCycle: "monthly" as const,
          isSystem: true,
        },
        {
          code: "PCNI_PNP",
          name: "PCNI PNP",
          companyId: pcniId,
          trackingCycle: "quarterly" as const,
          isSystem: true,
        },
      ]
    : [];

  if (productsData.length > 0) {
    await db.insert(products).values(productsData).onConflictDoNothing();
    console.log("  - Products seeded");
  }

  console.log("Lookup tables seeded successfully!");
}

