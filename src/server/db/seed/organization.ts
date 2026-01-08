import { db } from "@/server/db";
import { areas, branches, areaBranches, branchContacts, companies } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { SEED_CONFIG, PHILIPPINE_AREAS, PHILIPPINE_CITIES, generatePhilippineMobileNumber, generateLandlineNumber, getRandomInt } from "./helpers";

export async function seedOrganization() {
  console.log("Seeding organization data...");

  // Get companies from lookups (fetch existing if insert fails)
  let fcashCompany = await db.select().from(companies).where(eq(companies.code, "FCASH")).limit(1).then((res) => res[0]);
  let pcniCompany = await db.select().from(companies).where(eq(companies.code, "PCNI")).limit(1).then((res) => res[0]);

  // Try to insert companies, but if they exist, use the fetched ones
  const insertedCompanies = await db
    .insert(companies)
    .values([
      { code: "FCASH", name: "FCASH", isSystem: true },
      { code: "PCNI", name: "PCNI", isSystem: true },
    ])
    .onConflictDoNothing()
    .returning();

  // Use inserted companies if available, otherwise use fetched ones
  if (insertedCompanies.length > 0) {
    fcashCompany = insertedCompanies.find((c) => c.code === "FCASH");
    pcniCompany = insertedCompanies.find((c) => c.code === "PCNI");
  }

  // Seed Areas (insert all, let onConflictDoNothing handle duplicates)
  const areaData = PHILIPPINE_AREAS.slice(0, SEED_CONFIG.areas).map((area) => ({
    code: area.code,
    name: area.name,
    companyId: getRandomInt(0, 1) === 0 ? fcashCompany?.id : pcniCompany?.id,
  }));

  const insertedAreas = await db.insert(areas).values(areaData).onConflictDoNothing().returning();
  console.log(`  - ${insertedAreas.length} areas seeded`);

  // Fetch all areas from database (including newly inserted ones)
  const allAreas = await db.select().from(areas);

  // Seed Branches (only if we have areas)
  const branchesToInsert: typeof branches.$inferInsert[] = [];
  const areaBranchesToInsert: typeof areaBranches.$inferInsert[] = [];

  if (allAreas.length > 0) {
    allAreas.forEach((area) => {
      const cities = PHILIPPINE_CITIES[area.code as keyof typeof PHILIPPINE_CITIES] || [];
      const numBranches = getRandomInt(
        SEED_CONFIG.branchesPerArea.min,
        SEED_CONFIG.branchesPerArea.max
      );

      for (let i = 0; i < numBranches; i++) {
        const cityName = cities[i % cities.length] || "Unknown";
        const branchCode = `${area.code}-${cityName.substring(0, 3).toUpperCase()}-${i + 1}`;
        const branchName = `${cityName} Branch`;

        branchesToInsert.push({
          code: branchCode,
          name: branchName,
          location: `${cityName}, ${area.name}`,
          category: getRandomInt(1, 3) === 1 ? "Main" : "Satellite",
        });
      }
    });
  } else {
    console.log("  - No areas available, creating branches without area association");
    // Create branches without area association when no areas exist
    const cities = ["Manila", "Quezon City", "Cebu", "Davao", "Iloilo", "Cagayan de Oro", "Angeles City"];
    const numBranches = getRandomInt(SEED_CONFIG.branchesPerArea.min, SEED_CONFIG.branchesPerArea.max);

    for (let i = 0; i < numBranches; i++) {
      const cityName = cities[i % cities.length] ?? "Unknown";
      const branchCode = `GEN-${cityName.substring(0, 3).toUpperCase()}-${i + 1}`;
      const branchName = `${cityName} Branch`;

      branchesToInsert.push({
        code: branchCode,
        name: branchName,
        location: cityName,
        category: getRandomInt(1, 3) === 1 ? "Main" : "Satellite",
      });
    }
  }

  const insertedBranches = await db.insert(branches).values(branchesToInsert).onConflictDoNothing().returning();
  console.log(`  - ${insertedBranches.length} branches seeded`);

  // Link branches to areas
  allAreas.forEach((area) => {
    const areaBranchesList = insertedBranches.filter((branch) => {
      const areaCode = branch.code.split("-")[0];
      return areaCode === area.code;
    });

    areaBranchesList.forEach((branch, index) => {
      areaBranchesToInsert.push({
        areaId: area.id,
        branchId: branch.id,
        isPrimary: index === 0,
      });
    });
  });

  // Only insert area-branch relationships if we have branches
  if (areaBranchesToInsert.length > 0) {
    await db.insert(areaBranches).values(areaBranchesToInsert).onConflictDoNothing();
    console.log(`  - ${areaBranchesToInsert.length} area-branch relationships seeded`);
  }

  // Seed Branch Contacts
  const branchContactsToInsert: typeof branchContacts.$inferInsert[] = [];

  insertedBranches.forEach((branch) => {
    // Add primary phone contact
    branchContactsToInsert.push({
      branchId: branch.id,
      type: "phone",
      value: generateLandlineNumber(),
      isPrimary: true,
    });

    // Add secondary mobile contact
    branchContactsToInsert.push({
      branchId: branch.id,
      type: "mobile",
      value: generatePhilippineMobileNumber(),
      isPrimary: false,
    });

    // Add email contact
    branchContactsToInsert.push({
      branchId: branch.id,
      type: "email",
      value: `${branch.code.toLowerCase().replace(/-/g, ".")}@fcash-pcni.com`,
      isPrimary: false,
    });
  });

  // Only create branch contacts if we have branches
  if (insertedBranches.length > 0) {
    await db.insert(branchContacts).values(branchContactsToInsert).onConflictDoNothing();
    console.log(`  - ${branchContactsToInsert.length} branch contacts seeded`);
  } else {
    console.log("  - No branches available, skipping branch contacts");
  }

  console.log("Organization data seeded successfully!");

  return { areas: allAreas, branches: insertedBranches };
}
