// User management feature types

/**
 * User object with all fields
 */
export interface User {
  id: string;
  clerkId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  clerkOrgId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  passwordChangedAt: Date | null;
  lastLoginAt: Date | null;
  loginCount: number;
  failedLoginCount: number;
  lockedUntil: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User with permissions, areas, and branches
 */
export interface UserWithDetails {
  id: string;
  clerkId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  clerkOrgId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  passwordChangedAt: Date | null;
  lastLoginAt: Date | null;
  loginCount: number;
  failedLoginCount: number;
  lockedUntil: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  permissions: UserPermission[];
  areas: UserArea[];
  branches: UserBranch[];
}

/**
 * Paginated user list response
 */
export interface UserListResponse {
  success: boolean;
  data: User[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Permission object
 */
export interface Permission {
  id: string;
  code: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: Date;
}

/**
 * User permission with scope
 */
export interface UserPermission {
  userId: string;
  permissionId: string;
  permission: Permission;
  companyId: string | null;
  company: {
    id: string;
    name: string;
  } | null;
  scope: "self" | "branch" | "area" | "all";
  grantedAt: Date;
}

/**
 * Area object
 */
export interface Area {
  id: string;
  code: string;
  name: string;
  companyId: string | null;
  company: {
    id: string;
    name: string;
  } | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Branch object
 */
export interface Branch {
  id: string;
  code: string;
  name: string;
  location: string | null;
  category: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User area assignment
 */
export interface UserArea {
  userId: string;
  areaId: string;
  area: Area;
  grantedAt: Date;
}

/**
 * User branch assignment
 */
export interface UserBranch {
  userId: string;
  branchId: string;
  branch: Branch;
  grantedAt: Date;
}

/**
 * User session object
 */
export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
}

/**
 * Filter options for user list
 */
export interface UserFilters {
  isActive?: boolean;
  search?: string;
}

/**
 * Input for creating user
 */
export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  clerkUserId: string;
  clerkOrgId?: string;
  isActive?: boolean;
}

/**
 * Input for updating user
 */
export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  clerkOrgId?: string;
}

/**
 * Input for setting user permissions
 */
export interface SetUserPermissionsInput {
  permissions: {
    permissionId: string;
    companyId: string;
    scope: "self" | "all" | "team" | "branch" | "area";
  }[];
}

/**
 * Input for setting user territories
 */
export interface SetUserTerritoriesInput {
  areaIds?: string[];
  branchIds?: string[];
}

/**
 * User territories response
 */
export interface UserTerritories {
  areas: UserArea[];
  branches: UserBranch[];
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
  };
}
