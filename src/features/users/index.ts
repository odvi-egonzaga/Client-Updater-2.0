// Users feature module exports

// Types
export type {
  User,
  UserWithDetails,
  UserListResponse,
  Permission,
  UserPermission,
  Area,
  UserArea,
  Branch,
  UserBranch,
  UserSession,
  UserFilters,
  CreateUserInput,
  CreateUserWithRoleInput,
  UpdateUserInput,
  SetUserPermissionsInput,
  SetUserTerritoriesInput,
  UserTerritories,
  ApiResponse,
} from "./types";

// Store
export { useUsersStore } from "./stores/users-store";
export type { UsersStore, PaginationState } from "./stores/users-store";

// Hooks
export {
  useUsers,
  useUser,
  useUserPermissions,
  useUserTerritories,
  useUserSessions,
  useCreateUser,
  useCreateUserWithRole,
  useUpdateUser,
  useToggleUserStatus,
  useSetUserPermissions,
  useSetUserTerritories,
  useRevokeSession,
  useRevokeAllSessions,
} from "./hooks/use-users";

// Components
export { UserCreationForm } from "./components/user-creation-form";
