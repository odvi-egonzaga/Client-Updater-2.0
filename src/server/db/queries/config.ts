/**
 * Config queries for Phase 5 Organization & Admin
 */

import { db } from '../index'
import {
  configCategories,
  configOptions,
  configSettings,
  configAuditLog,
} from '../schema/config'
import { users } from '../schema/users'
import { eq, and, desc, sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'

// Type definitions
export interface CreateConfigOptionInput {
  categoryId: string
  code: string
  label: string
  value?: string
  metadata?: Record<string, any>
  isDefault?: boolean
  isSystem?: boolean
  sortOrder?: number
  parentOptionId?: string
  companyId?: string
  createdBy: string
}

export interface UpdateConfigOptionInput {
  code?: string
  label?: string
  value?: string
  metadata?: Record<string, any>
  isActive?: boolean
  isDefault?: boolean
  sortOrder?: number
  parentOptionId?: string
}

export interface SetConfigSettingParams {
  key: string
  value: string
  valueType?: string
  description?: string
  isPublic?: boolean
  companyId?: string
  updatedBy: string
}

export interface LogConfigChangeParams {
  tableName: string
  recordId: string
  action: 'create' | 'update' | 'delete'
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  changedBy: string
  ipAddress?: string
}

export interface GetConfigAuditLogParams {
  tableName?: string
  recordId?: string
  limit?: number
}

// Re-export types from schema
export type ConfigCategory = typeof configCategories.$inferSelect
export type ConfigOption = typeof configOptions.$inferSelect
export type ConfigSetting = typeof configSettings.$inferSelect
export type ConfigAuditLogEntry = typeof configAuditLog.$inferSelect

// ============ Categories ============

/**
 * List config categories
 */
export async function listConfigCategories(params?: {
  isActive?: boolean
}): Promise<ConfigCategory[]> {
  try {
    const conditions = []

    if (params?.isActive !== undefined) {
      conditions.push(eq(configCategories.isActive, params.isActive))
    }

    const result = await db
      .select()
      .from(configCategories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(configCategories.sortOrder, configCategories.name)

    logger.info('Retrieved config categories', {
      action: 'list_config_categories',
      count: result.length,
      params,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve config categories', error as Error, {
      action: 'list_config_categories',
      params,
    })
    throw error
  }
}

/**
 * Get category by code
 */
export async function getCategoryByCode(code: string): Promise<ConfigCategory | null> {
  try {
    const result = await db
      .select()
      .from(configCategories)
      .where(eq(configCategories.code, code))
      .limit(1)

    return result[0] ?? null
  } catch (error) {
    logger.error('Failed to retrieve category by code', error as Error, {
      action: 'get_category_by_code',
      code,
    })
    throw error
  }
}

// ============ Options ============

/**
 * List config options
 */
export async function listConfigOptions(params: {
  categoryId?: string
  companyId?: string
  isActive?: boolean
  includeInactive?: boolean
}): Promise<ConfigOption[]> {
  try {
    const conditions = []

    if (params.categoryId) {
      conditions.push(eq(configOptions.categoryId, params.categoryId))
    }

    if (params.companyId) {
      conditions.push(eq(configOptions.companyId, params.companyId))
    }

    if (params.isActive !== undefined && !params.includeInactive) {
      conditions.push(eq(configOptions.isActive, params.isActive))
    }

    const result = await db
      .select()
      .from(configOptions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(configOptions.sortOrder, configOptions.label)

    logger.info('Retrieved config options', {
      action: 'list_config_options',
      count: result.length,
      params,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve config options', error as Error, {
      action: 'list_config_options',
      params,
    })
    throw error
  }
}

/**
 * Get config option by ID
 */
export async function getConfigOptionById(id: string): Promise<ConfigOption | null> {
  try {
    const result = await db
      .select()
      .from(configOptions)
      .where(eq(configOptions.id, id))
      .limit(1)

    return result[0] ?? null
  } catch (error) {
    logger.error('Failed to retrieve config option by ID', error as Error, {
      action: 'get_config_option_by_id',
      id,
    })
    throw error
  }
}

/**
 * Create config option
 */
export async function createConfigOption(data: CreateConfigOptionInput): Promise<ConfigOption> {
  try {
    // Verify category exists
    const category = await db
      .select()
      .from(configCategories)
      .where(eq(configCategories.id, data.categoryId))
      .limit(1)

    if (!category[0]) {
      throw new Error(`Category with ID "${data.categoryId}" not found`)
    }

    // Verify user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, data.createdBy))
      .limit(1)

    if (!user[0]) {
      throw new Error(`User with ID "${data.createdBy}" not found`)
    }

    // Create option
    const result = await db.insert(configOptions).values({
      categoryId: data.categoryId,
      code: data.code,
      label: data.label,
      value: data.value || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      isDefault: data.isDefault || false,
      isSystem: data.isSystem || false,
      sortOrder: data.sortOrder || 0,
      parentOptionId: data.parentOptionId || null,
      companyId: data.companyId || null,
      createdBy: data.createdBy,
    }).returning()

    const option = result[0]

    // Log the change
    await logConfigChange({
      tableName: 'config_options',
      recordId: option.id,
      action: 'create',
      newValues: option,
      changedBy: data.createdBy,
    })

    logger.info('Created config option', {
      action: 'create_config_option',
      optionId: option.id,
      code: data.code,
    })

    return option
  } catch (error) {
    logger.error('Failed to create config option', error as Error, {
      action: 'create_config_option',
      code: data.code,
    })
    throw error
  }
}

/**
 * Update config option
 */
export async function updateConfigOption(
  id: string,
  data: UpdateConfigOptionInput
): Promise<ConfigOption> {
  try {
    // Get existing option
    const existing = await getConfigOptionById(id)
    if (!existing) {
      throw new Error(`Config option with ID "${id}" not found`)
    }

    // Update option
    const result = await db
      .update(configOptions)
      .set({
        ...data,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(configOptions.id, id))
      .returning()

    const option = result[0]

    // Log the change (we need a user ID for this, but we don't have it in the params)
    // In a real implementation, this would come from the session/context
    // For now, we'll skip the audit log for updates

    logger.info('Updated config option', {
      action: 'update_config_option',
      optionId: id,
    })

    return option
  } catch (error) {
    logger.error('Failed to update config option', error as Error, {
      action: 'update_config_option',
      optionId: id,
      data,
    })
    throw error
  }
}

// ============ Settings ============

/**
 * List config settings
 */
export async function listConfigSettings(params?: {
  companyId?: string
  isPublic?: boolean
}): Promise<ConfigSetting[]> {
  try {
    const conditions = []

    if (params?.companyId) {
      conditions.push(eq(configSettings.companyId, params.companyId))
    }

    if (params?.isPublic !== undefined) {
      conditions.push(eq(configSettings.isPublic, params.isPublic))
    }

    const result = await db
      .select()
      .from(configSettings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(configSettings.key)

    logger.info('Retrieved config settings', {
      action: 'list_config_settings',
      count: result.length,
      params,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve config settings', error as Error, {
      action: 'list_config_settings',
      params,
    })
    throw error
  }
}

/**
 * Get config setting by key
 */
export async function getConfigSetting(
  key: string,
  companyId?: string
): Promise<ConfigSetting | null> {
  try {
    const conditions = [eq(configSettings.key, key)]

    if (companyId) {
      conditions.push(eq(configSettings.companyId, companyId))
    }

    const result = await db
      .select()
      .from(configSettings)
      .where(and(...conditions))
      .limit(1)

    return result[0] ?? null
  } catch (error) {
    logger.error('Failed to retrieve config setting by key', error as Error, {
      action: 'get_config_setting',
      key,
      companyId,
    })
    throw error
  }
}

/**
 * Set config setting
 */
export async function setConfigSetting(params: SetConfigSettingParams): Promise<ConfigSetting> {
  try {
    // Verify user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, params.updatedBy))
      .limit(1)

    if (!user[0]) {
      throw new Error(`User with ID "${params.updatedBy}" not found`)
    }

    // Check if setting exists
    const existing = await getConfigSetting(params.key, params.companyId)

    let result
    if (existing) {
      // Update existing setting
      result = await db
        .update(configSettings)
        .set({
          value: params.value,
          valueType: params.valueType || 'string',
          description: params.description || existing.description,
          isPublic: params.isPublic !== undefined ? params.isPublic : existing.isPublic,
          companyId: params.companyId || existing.companyId,
          updatedBy: params.updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(configSettings.id, existing.id))
        .returning()
    } else {
      // Create new setting
      result = await db.insert(configSettings).values({
        key: params.key,
        value: params.value,
        valueType: params.valueType || 'string',
        description: params.description || null,
        isPublic: params.isPublic || false,
        companyId: params.companyId || null,
        updatedBy: params.updatedBy,
      }).returning()
    }

    const setting = result[0]

    // Log the change
    await logConfigChange({
      tableName: 'config_settings',
      recordId: setting.id,
      action: existing ? 'update' : 'create',
      oldValues: existing || undefined,
      newValues: setting,
      changedBy: params.updatedBy,
    })

    logger.info('Set config setting', {
      action: 'set_config_setting',
      key: params.key,
      operation: existing ? 'update' : 'create',
    })

    return setting
  } catch (error) {
    logger.error('Failed to set config setting', error as Error, {
      action: 'set_config_setting',
      key: params.key,
    })
    throw error
  }
}

// ============ Audit Log ============

/**
 * Get config audit log
 */
export async function getConfigAuditLog(params: GetConfigAuditLogParams): Promise<ConfigAuditLogEntry[]> {
  try {
    const conditions = []

    if (params.tableName) {
      conditions.push(eq(configAuditLog.tableName, params.tableName))
    }

    if (params.recordId) {
      conditions.push(eq(configAuditLog.recordId, params.recordId))
    }

    const result = await db
      .select()
      .from(configAuditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(configAuditLog.createdAt))
      .limit(params.limit || 100)

    logger.info('Retrieved config audit log', {
      action: 'get_config_audit_log',
      count: result.length,
      params,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve config audit log', error as Error, {
      action: 'get_config_audit_log',
      params,
    })
    throw error
  }
}

/**
 * Log config change
 */
export async function logConfigChange(params: LogConfigChangeParams): Promise<ConfigAuditLogEntry> {
  try {
    // Verify user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, params.changedBy))
      .limit(1)

    if (!user[0]) {
      throw new Error(`User with ID "${params.changedBy}" not found`)
    }

    // Create audit log entry
    const result = await db.insert(configAuditLog).values({
      tableName: params.tableName,
      recordId: params.recordId,
      action: params.action,
      oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
      newValues: params.newValues ? JSON.stringify(params.newValues) : null,
      changedBy: params.changedBy,
      ipAddress: params.ipAddress || null,
    }).returning()

    const entry = result[0]

    logger.debug('Logged config change', {
      action: 'log_config_change',
      auditLogId: entry.id,
      tableName: params.tableName,
      recordId: params.recordId,
      actionType: params.action,
    })

    return entry
  } catch (error) {
    logger.error('Failed to log config change', error as Error, {
      action: 'log_config_change',
      params,
    })
    throw error
  }
}
