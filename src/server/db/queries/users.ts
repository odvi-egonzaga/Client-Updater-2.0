import { db } from '../index'
import { users } from '../schema/users'
import { eq } from 'drizzle-orm'

export async function getUserById(id: string) {
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user[0] ?? null
}
