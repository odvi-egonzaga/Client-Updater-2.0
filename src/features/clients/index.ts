// Clients feature module exports

// Types
export type {
  Client,
  ClientWithDetails,
  LookupItem,
  Branch,
  ClientStatus,
  ClientSearchResult,
  SyncJob,
  ClientSyncHistory,
  ClientFilters as ClientFiltersType,
  ClientListResponse,
  PaginatedResponse,
  ApiResponse,
  TriggerSyncInput,
} from "./types";

// Store
export { useClientsStore } from "./stores/clients-store";
export type { ClientsStore, PaginationState } from "./stores/clients-store";

// Hooks
export {
  useClients,
  useClient,
  useClientSyncHistory,
  useClientSearch,
  useSyncJobs,
  useSyncJob,
  useTriggerSync,
  usePreviewSync,
} from "./hooks/use-clients";

// Components
export {
  ClientFilters,
  ClientTable,
  ClientDetail,
  SyncStatus,
} from "./components";
