export interface ConfigOption {
  id: string
  categoryId: string
  code: string
  label: string
  value: string | null
  metadata: Record<string, any> | null
  isDefault: boolean
  isSystem: boolean
  isActive: boolean
  sortOrder: number
  parentOptionId: string | null
  companyId: string | null
  createdAt: string
  updatedAt: string
}

export interface ConfigCategory {
  id: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ConfigSetting {
  key: string
  value: string
  valueType: 'string' | 'number' | 'boolean' | 'json'
  description: string | null
  isPublic: boolean
  companyId: string | null
  updatedAt: string
  updatedBy: string | null
}

export interface ConfigAuditLogEntry {
  id: string
  tableName: string
  recordId: string | null
  action: string
  oldValue: any
  newValue: any
  changedBy: string | null
  changedAt: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: {
    code?: string
    message: string
  }
}
