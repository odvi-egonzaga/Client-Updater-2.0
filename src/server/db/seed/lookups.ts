import { db } from '@/server/db'
import { companies, pensionTypes, pensionerTypes, accountTypes, parStatuses, statusTypes, statusReasons, products } from '@/server/db/schema'

export async function seedLookups() {
  console.log('Seeding lookup tables...')

  // Companies - Use onConflictDoNothing for idempotency
  const insertedCompanies = await db.insert(companies)
    .values([
      { code: 'FCASH', name: 'FCASH', isSystem: true },
      { code: 'PCNI', name: 'PCNI', isSystem: true },
    ])
    .onConflictDoNothing()
    .returning()

  // If companies already exist, fetch them
  let fcashCompany = insertedCompanies?.[0]
  let pcniCompany = insertedCompanies?.[1]

  if (!fcashCompany || !pcniCompany) {
    const existingCompanies = await db.select().from(companies)
    fcashCompany = existingCompanies.find(c => c.code === 'FCASH')
    pcniCompany = existingCompanies.find(c => c.code === 'PCNI')
  }

  // Ensure we have valid company objects
  if (!fcashCompany || !pcniCompany) {
    throw new Error('Failed to seed or retrieve companies')
  }

  console.log('  - Companies seeded')

  // Pension Types - Use onConflictDoNothing for idempotency
  const pensionTypesData = [
    { code: 'SSS', name: 'SSS', companyId: fcashCompany.id, isSystem: true },
    { code: 'GSIS', name: 'GSIS', companyId: fcashCompany.id, isSystem: true },
    { code: 'PVAO', name: 'PVAO', companyId: fcashCompany.id, isSystem: true },
    { code: 'NON_PNP', name: 'Non-PNP', companyId: pcniCompany.id, isSystem: true },
    { code: 'PNP', name: 'PNP', companyId: pcniCompany.id, isSystem: true },
  ]
  await db.insert(pensionTypes).values(pensionTypesData).onConflictDoNothing()
  console.log('  - Pension Types seeded')

  // Pensioner Types - Use onConflictDoNothing for idempotency
  const pensionerTypesData = [
    { code: 'DEPENDENT', name: 'Dependent', isSystem: true },
    { code: 'DISABILITY', name: 'Disability', isSystem: true },
    { code: 'RETIREE', name: 'Retiree', isSystem: true },
    { code: 'ITF', name: 'ITF', isSystem: true },
  ]
  await db.insert(pensionerTypes).values(pensionerTypesData).onConflictDoNothing()
  console.log('  - Pensioner Types seeded')

  // Account Types - Use onConflictDoNothing for idempotency
  const accountTypesData = [
    { code: 'PASSBOOK', name: 'Passbook', isSystem: true, sortOrder: 1 },
    { code: 'ATM', name: 'ATM', isSystem: true, sortOrder: 2 },
    { code: 'BOTH', name: 'Both', isSystem: true, sortOrder: 3 },
    { code: 'NONE', name: 'None', isSystem: true, sortOrder: 4 },
  ]
  await db.insert(accountTypes).values(accountTypesData).onConflictDoNothing()
  console.log('  - Account Types seeded')

  // PAR Statuses - Use onConflictDoNothing for idempotency
  const parStatusesData = [
    { code: 'do_not_show', name: 'Current', isTrackable: true, isSystem: true, sortOrder: 1 },
    { code: 'tele_130', name: '30+ Days', isTrackable: true, isSystem: true, sortOrder: 2 },
    { code: 'tele_hardcore', name: '60+ Days', isTrackable: false, isSystem: true, sortOrder: 3 },
  ]
  await db.insert(parStatuses).values(parStatusesData).onConflictDoNothing()
  console.log('  - PAR Statuses seeded')

  // Status Types - Use onConflictDoNothing for idempotency
  const statusTypesData = [
    { code: 'PENDING', name: 'Pending', sequence: 1, isSystem: true },
    { code: 'TO_FOLLOW', name: 'To Follow', sequence: 2, isSystem: true },
    { code: 'CALLED', name: 'Called', sequence: 3, isSystem: true },
    { code: 'VISITED', name: 'Visited', sequence: 4, companyId: fcashCompany.id, isSystem: true },
    { code: 'UPDATED', name: 'Updated', sequence: 5, isSystem: true },
    { code: 'DONE', name: 'Done', sequence: 6, isSystem: true },
  ]
  const insertedStatusTypes = await db.insert(statusTypes)
    .values(statusTypesData)
    .onConflictDoNothing()
    .returning()

  // If status types already exist, fetch them
  let doneStatus = insertedStatusTypes?.find(s => s.code === 'DONE')
  if (!doneStatus) {
    const existingStatusTypes = await db.select().from(statusTypes)
    doneStatus = existingStatusTypes.find(s => s.code === 'DONE')
  }

  console.log('  - Status Types seeded')

  // Status Reasons - Use onConflictDoNothing for idempotency
  if (doneStatus) {
    const statusReasonsData = [
      { code: 'DECEASED', name: 'Deceased', statusTypeId: doneStatus.id, isTerminal: true, isSystem: true },
      { code: 'FULLY_PAID', name: 'Fully Paid', statusTypeId: doneStatus.id, isTerminal: true, isSystem: true },
      { code: 'CONFIRMED', name: 'Confirmed', statusTypeId: doneStatus.id, isTerminal: false, isSystem: true },
      { code: 'NOT_REACHABLE', name: 'Not Reachable', statusTypeId: doneStatus.id, requiresRemarks: true, isSystem: true },
    ]
    await db.insert(statusReasons).values(statusReasonsData).onConflictDoNothing()
    console.log('  - Status Reasons seeded')
  }

  // Products - Use onConflictDoNothing for idempotency
  const productsData = [
    { code: 'FCASH_SSS', name: 'FCASH SSS', companyId: fcashCompany.id, trackingCycle: 'monthly' as const, isSystem: true },
    { code: 'FCASH_GSIS', name: 'FCASH GSIS', companyId: fcashCompany.id, trackingCycle: 'monthly' as const, isSystem: true },
    { code: 'PCNI_NON_PNP', name: 'PCNI Non-PNP', companyId: pcniCompany.id, trackingCycle: 'monthly' as const, isSystem: true },
    { code: 'PCNI_PNP', name: 'PCNI PNP', companyId: pcniCompany.id, trackingCycle: 'quarterly' as const, isSystem: true },
  ]
  await db.insert(products).values(productsData).onConflictDoNothing()
  console.log('  - Products seeded')

  console.log('Lookup tables seeded successfully!')
}







