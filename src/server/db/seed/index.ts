import { seedLookups } from './lookups'
import { seedPermissions } from './permissions'

async function main() {
  console.log('Starting database seed...\n')

  try {
    await seedLookups()
    console.log('')
    await seedPermissions()

    console.log('\n✅ Database seeded successfully!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    process.exit(1)
  }
}

main()



