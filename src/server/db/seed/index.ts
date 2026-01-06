import { seedLookups } from './lookups'
import { seedPermissions } from './permissions'

/**
 * Seed the database with lookup data and permissions
 * This function is idempotent and can be run multiple times safely
 */
export async function seedDatabase() {
  console.log('Starting database seed...\n')

  try {
    await seedLookups()
    console.log('')
    await seedPermissions()

    console.log('\n✅ Database seeded successfully!')
  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    throw error
  }
}

// CLI execution
async function main() {
  try {
    await seedDatabase()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    process.exit(1)
  }
}

// Only run main if this file is executed directly
if (require.main === module) {
  main()
}






