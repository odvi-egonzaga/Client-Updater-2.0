export interface Area {
  id: string
  code: string
  name: string
  companyId: string | null
  isActive: boolean
  sortOrder: number | null
  createdAt: string
  updatedAt: string
  branches?: AreaBranch[]
  branchesCount?: number
}

export interface AreaBranch {
  id: string
  areaId: string
  branchId: string
  isPrimary: boolean
  createdAt: string
  branch?: {
    id: string
    code: string
    name: string
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
