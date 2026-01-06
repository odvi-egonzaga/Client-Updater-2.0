export interface Branch {
  id: string
  code: string
  name: string
  location: string | null
  category: string | null
  isActive: boolean
  sortOrder: number | null
  createdAt: string
  updatedAt: string
  areas?: Area[]
  contacts?: BranchContact[]
  contactsCount?: number
}

export interface Area {
  id: string
  code: string
  name: string
  companyId: string | null
  isActive: boolean
  sortOrder: number | null
  createdAt: string
  updatedAt: string
}

export interface BranchContact {
  id: string
  branchId: string
  type: string
  label: string | null
  value: string
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export interface BranchFilters {
  search?: string
  areaId?: string
  category?: string
  isActive?: boolean
}

export interface BranchListResponse {
  data: Branch[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AreaFilters {
  search?: string
  companyId?: string
  isActive?: boolean
}

export interface AreaListResponse {
  data: Area[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: {
    code?: string
    message: string
  }
}
