import { db } from "@/server/db";
import { clients, pensionTypes, pensionerTypes, products, accountTypes, parStatuses } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  SEED_CONFIG,
  generateFilipinoName,
  generatePhilippineMobileNumber,
  generateSSSNumber,
  generateGSISNumber,
  generatePVAONumber,
  generatePCNINumber,
  generateClientCode,
  generatePensionerBirthDate,
  generatePastDueAmount,
  getRandomInt,
  getRandomItem,
  getRandomBoolean,
} from "./helpers";

export async function seedClients(organizationData: { branches: any[] }) {
  console.log("Seeding clients...");

  // Get lookup data
  const [pensionTypesData, pensionerTypesData, productsData, accountTypesData, parStatusesData] = await Promise.all([
    db.select().from(pensionTypes),
    db.select().from(pensionerTypes),
    db.select().from(products),
    db.select().from(accountTypes),
    db.select().from(parStatuses),
  ]);

  const clientsToCreate: typeof clients.$inferInsert[] = [];

  // Distribute clients across branches
  organizationData.branches.forEach((branch) => {
    const numClients = getRandomInt(
      SEED_CONFIG.clientsPerBranch.min,
      SEED_CONFIG.clientsPerBranch.max
    );

    for (let i = 0; i < numClients; i++) {
      const product = getRandomItem(productsData);
      const pensionType = pensionTypesData.find((pt) => pt.id === product.companyId);
      const pensionerType = getRandomItem(pensionerTypesData);
      const accountType = getRandomItem(accountTypesData);
      const parStatus = getRandomItem(parStatusesData);

      const client = createClient(
        branch,
        product,
        pensionType,
        pensionerType,
        accountType,
        parStatus
      );

      clientsToCreate.push(client);
    }
  });

  const insertedClients = await db.insert(clients).values(clientsToCreate).onConflictDoNothing().returning();
  console.log(`  - ${insertedClients.length} clients seeded`);

  console.log("Clients seeded successfully!");

  return insertedClients;
}

function createClient(
  branch: any,
  product: any,
  pensionType: any,
  pensionerType: any,
  accountType: any,
  parStatus: any
): typeof clients.$inferInsert {
  const fullName = generateFilipinoName();
  const birthDate = generatePensionerBirthDate().toISOString().split('T')[0];

  // Generate pension number based on pension type
  let pensionNumber: string;
  switch (pensionType?.code) {
    case "SSS":
      pensionNumber = generateSSSNumber();
      break;
    case "GSIS":
      pensionNumber = generateGSISNumber();
      break;
    case "PVAO":
      pensionNumber = generatePVAONumber();
      break;
    default:
      pensionNumber = generatePCNINumber();
  }

  // Generate contact numbers
  const contactNumber = generatePhilippineMobileNumber();
  const contactNumberAlt = getRandomBoolean(0.3)
    ? generatePhilippineMobileNumber()
    : null;

  // Generate past due amount (some clients have no past due)
  const hasPastDue = getRandomBoolean(0.6);
  const pastDueAmount = hasPastDue ? generatePastDueAmount() : null;

  // Determine loan status based on PAR status
  let loanStatus: string | null = null;
  if (parStatus?.code === "tele_130") {
    loanStatus = "30+ Days";
  } else if (parStatus?.code === "tele_hardcore") {
    loanStatus = "60+ Days";
  }

  return {
    clientCode: generateClientCode(product?.code || "GEN"),
    fullName,
    pensionNumber,
    birthDate,
    contactNumber,
    contactNumberAlt,
    pensionTypeId: pensionType?.id,
    pensionerTypeId: pensionerType?.id,
    productId: product?.id,
    branchId: branch.id,
    parStatusId: parStatus?.id,
    accountTypeId: accountType?.id,
    pastDueAmount: pastDueAmount,
    loanStatus,
    isActive: true,
    lastSyncedAt: new Date(),
    syncSource: getRandomItem(["snowflake", "nextbank"] as const),
  };
}
