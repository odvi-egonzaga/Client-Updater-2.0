/**
 * Branch contact queries for Phase 5 Organization & Admin
 */

import { db } from '../index'
import { branches, branchContacts } from '../schema/organization'
import { eq, and, isNull } from 'drizzle-orm'
import { logger } from '@/lib/logger'

// Type definitions
export interface CreateBranchContactInput {
  branchId: string
  type: string
  label?: string
  value: string
  isPrimary?: boolean
}

export interface UpdateBranchContactInput {
  type?: string
  label?: string
  value?: string
  isPrimary?: boolean
}

export interface SetPrimaryContactParams {
  branchId: string
  contactId: string
}

// Re-export types from schema
export type Branch = typeof branches.$inferSelect
export type BranchContact = typeof branchContacts.$inferSelect

/**
 * Get all contacts for a branch
 */
export async function getContactsForBranch(branchId: string): Promise<BranchContact[]> {
  try {
    // Verify branch exists
    const branch = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, branchId), isNull(branches.deletedAt)))
      .limit(1)

    if (!branch[0]) {
      throw new Error(`Branch with ID "${branchId}" not found`)
    }

    // Get contacts for this branch
    const result = await db
      .select()
      .from(branchContacts)
      .where(eq(branchContacts.branchId, branchId))
      .orderBy(branchContacts.type, branchContacts.label)

    logger.info('Retrieved contacts for branch', {
      action: 'get_contacts_for_branch',
      branchId,
      count: result.length,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve contacts for branch', error as Error, {
      action: 'get_contacts_for_branch',
      branchId,
    })
    throw error
  }
}

/**
 * Add contact with primary handling (clears existing primary of same type)
 */
export async function addBranchContact(data: CreateBranchContactInput): Promise<BranchContact> {
  try {
    // Verify branch exists
    const branch = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, data.branchId), isNull(branches.deletedAt)))
      .limit(1)

    if (!branch[0]) {
      throw new Error(`Branch with ID "${data.branchId}" not found`)
    }

    // If setting as primary, clear existing primary of same type
    if (data.isPrimary) {
      await db
        .update(branchContacts)
        .set({ isPrimary: false })
        .where(
          and(
            eq(branchContacts.branchId, data.branchId),
            eq(branchContacts.type, data.type)
          )
        )
    }

    // Create contact
    const result = await db.insert(branchContacts).values({
      branchId: data.branchId,
      type: data.type,
      label: data.label || null,
      value: data.value,
      isPrimary: data.isPrimary || false,
    }).returning()

    const contact = result[0]

    logger.info('Added branch contact', {
      action: 'add_branch_contact',
      contactId: contact.id,
      branchId: data.branchId,
      type: data.type,
    })

    return contact
  } catch (error) {
    logger.error('Failed to add branch contact', error as Error, {
      action: 'add_branch_contact',
      data,
    })
    throw error
  }
}

/**
 * Update contact
 */
export async function updateBranchContact(id: string, data: UpdateBranchContactInput): Promise<BranchContact> {
  try {
    // Get existing contact
    const existing = await db
      .select()
      .from(branchContacts)
      .where(eq(branchContacts.id, id))
      .limit(1)

    if (!existing[0]) {
      throw new Error(`Contact with ID "${id}" not found`)
    }

    const contact = existing[0]

    // If setting as primary, clear existing primary of same type
    if (data.isPrimary && data.type) {
      await db
        .update(branchContacts)
        .set({ isPrimary: false })
        .where(
          and(
            eq(branchContacts.branchId, contact.branchId),
            eq(branchContacts.type, data.type),
            // Exclude current contact
            // Note: This is a simple approach, might need refinement for complex scenarios
          )
        )
    } else if (data.isPrimary && !data.type) {
      // If setting as primary without changing type, clear existing primary of current type
      await db
        .update(branchContacts)
        .set({ isPrimary: false })
        .where(
          and(
            eq(branchContacts.branchId, contact.branchId),
            eq(branchContacts.type, contact.type)
          )
        )
    }

    // Update contact
    const result = await db
      .update(branchContacts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(branchContacts.id, id))
      .returning()

    logger.info('Updated branch contact', {
      action: 'update_branch_contact',
      contactId: id,
    })

    return result[0]
  } catch (error) {
    logger.error('Failed to update branch contact', error as Error, {
      action: 'update_branch_contact',
      contactId: id,
      data,
    })
    throw error
  }
}

/**
 * Delete contact
 */
export async function deleteBranchContact(id: string): Promise<void> {
  try {
    // Verify contact exists
    const existing = await db
      .select()
      .from(branchContacts)
      .where(eq(branchContacts.id, id))
      .limit(1)

    if (!existing[0]) {
      throw new Error(`Contact with ID "${id}" not found`)
    }

    // Delete contact
    await db
      .delete(branchContacts)
      .where(eq(branchContacts.id, id))

    logger.info('Deleted branch contact', {
      action: 'delete_branch_contact',
      contactId: id,
    })
  } catch (error) {
    logger.error('Failed to delete branch contact', error as Error, {
      action: 'delete_branch_contact',
      contactId: id,
    })
    throw error
  }
}

/**
 * Set primary by type
 */
export async function setPrimaryContact(params: SetPrimaryContactParams): Promise<void> {
  const { branchId, contactId } = params

  try {
    // Verify branch exists
    const branch = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, branchId), isNull(branches.deletedAt)))
      .limit(1)

    if (!branch[0]) {
      throw new Error(`Branch with ID "${branchId}" not found`)
    }

    // Get contact to set as primary
    const contact = await db
      .select()
      .from(branchContacts)
      .where(and(eq(branchContacts.id, contactId), eq(branchContacts.branchId, branchId)))
      .limit(1)

    if (!contact[0]) {
      throw new Error(`Contact with ID "${contactId}" not found for branch "${branchId}"`)
    }

    // Clear all primary flags for this type
    await db
      .update(branchContacts)
      .set({ isPrimary: false })
      .where(
        and(
          eq(branchContacts.branchId, branchId),
          eq(branchContacts.type, contact[0].type)
        )
      )

    // Set new primary
    await db
      .update(branchContacts)
      .set({ isPrimary: true })
      .where(eq(branchContacts.id, contactId))

    logger.info('Set primary contact', {
      action: 'set_primary_contact',
      branchId,
      contactId,
      type: contact[0].type,
    })
  } catch (error) {
    logger.error('Failed to set primary contact', error as Error, {
      action: 'set_primary_contact',
      params,
    })
    throw error
  }
}
