# Client Management Module

This module handles all client-related operations including viewing, searching, updating, and managing client information.

## Overview

The Client Management module provides comprehensive functionality for managing pension clients, including:
- Client listing with pagination and filtering
- Client search functionality
- Client detail views
- Client information updates
- Bulk operations

## File Structure

```
src/features/clients/
├── types.ts                 # TypeScript type definitions
├── components/              # Client-related UI components
│   ├── client-table.tsx    # Table component for listing clients
│   ├── client-detail.tsx    # Client detail view component
│   └── client-form.tsx     # Form for creating/editing clients
├── hooks/                  # Custom React hooks
│   └── use-clients.ts      # Hook for client data fetching and mutations
└── __tests__/              # Test files
    ├── types.test.ts        # Type definition tests
    └── components.test.tsx  # Component tests
```

## Key Functions

### Client Types

```typescript
interface Client {
  id: string
  accountNumber: string
  firstName: string
  lastName: string
  middleName?: string
  dateOfBirth: Date
  gender: 'male' | 'female'
  address: string
  city: string
  province: string
  postalCode: string
  phoneNumber: string
  emailAddress?: string
  companyId: string
  pensionTypeId: string
  pensionerTypeId: string
  accountTypeId: string
  branchId: string
  areaId: string
  statusId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface ClientFilters {
  companyId?: string
  pensionTypeId?: string
  statusId?: string
  branchId?: string
  areaId?: string
  search?: string
  isActive?: boolean
}
```

### Client Hooks

#### `useClients(page?, pageSize?, filters?, options?)`

Fetches paginated list of clients with optional filters.

**Parameters:**
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Number of items per page (default: 25)
- `filters` (ClientFilters, optional): Filter criteria
- `options` (UseQueryOptions, optional): Additional TanStack Query options

**Returns:**
- `data`: Paginated client list
- `isLoading`: Loading state
- `error`: Error object if request failed
- `isFetching`: Fetching state for refetches

**Example:**
```typescript
const { data, isLoading, error } = useClients(1, 25, {
  companyId: 'fcash-id',
  statusId: 'active-id'
})
```

#### `useClient(clientId, options?)`

Fetches a single client by ID.

**Parameters:**
- `clientId` (string): Client ID
- `options` (UseQueryOptions, optional): Additional TanStack Query options

**Returns:**
- `data`: Client object
- `isLoading`: Loading state
- `error`: Error object if request failed

**Example:**
```typescript
const { data, isLoading, error } = useClient('client-id')
```

#### `useUpdateClient(clientId, options?)`

Mutation hook for updating client information.

**Parameters:**
- `clientId` (string): Client ID to update
- `options` (UseMutationOptions, optional): Additional mutation options

**Returns:**
- `mutate`: Function to trigger the mutation
- `isPending`: Mutation loading state
- `error`: Error object if mutation failed
- `data`: Updated client data

**Example:**
```typescript
const updateClient = useUpdateClient('client-id')

updateClient.mutate({
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '123-456-7890'
})
```

## API Endpoints

### `GET /api/clients`

Lists clients with pagination and filters.

**Query Parameters:**
- `page` (number): Page number
- `pageSize` (number): Items per page
- `companyId` (string): Filter by company
- `pensionTypeId` (string): Filter by pension type
- `statusId` (string): Filter by status
- `branchId` (string): Filter by branch
- `areaId` (string): Filter by area
- `search` (string): Search term for name, account number, or phone
- `isActive` (boolean): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "client-id",
      "accountNumber": "123456",
      "firstName": "John",
      "lastName": "Doe",
      ...
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 1000,
    "totalPages": 40
  }
}
```

### `GET /api/clients/:id`

Gets client details by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "client-id",
    "accountNumber": "123456",
    "firstName": "John",
    "lastName": "Doe",
    ...
  }
}
```

### `PATCH /api/clients/:id`

Updates client information.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "123-456-7890",
  ...
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "client-id",
    "accountNumber": "123456",
    "firstName": "John",
    "lastName": "Doe",
    ...
  }
}
```

### `GET /api/clients/search`

Searches for clients by various criteria.

**Query Parameters:**
- `q` (string): Search query
- `limit` (number): Maximum results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "client-id",
      "accountNumber": "123456",
      "firstName": "John",
      "lastName": "Doe",
      ...
    }
  ]
}
```

## Permissions Required

- `clients:read`: View client list and details
- `clients:update`: Update client information

## Business Rules

1. **Account Number Uniqueness**: Each client must have a unique account number within their company.

2. **Required Fields**: The following fields are required:
   - Account number
   - First name
   - Last name
   - Date of birth
   - Gender
   - Address
   - City
   - Province
   - Postal code
   - Phone number
   - Company
   - Pension type
   - Pensioner type
   - Account type
   - Branch
   - Area
   - Status

3. **Validation Rules**:
   - Phone number must be in valid format
   - Email address must be valid if provided
   - Date of birth must be in the past
   - Gender must be either 'male' or 'female'

4. **Soft Delete**: Clients are not physically deleted. Instead, they are marked as inactive.

5. **Audit Trail**: All client updates are logged in the activity log.

## Usage Examples

### Listing Clients with Filters

```typescript
'use client'

import { useClients } from '@/features/clients/hooks/use-clients'

export function ClientList() {
  const { data, isLoading, error } = useClients(1, 25, {
    companyId: 'fcash-id',
    statusId: 'active-id'
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading clients</div>

  return (
    <ul>
      {data?.data.map(client => (
        <li key={client.id}>
          {client.firstName} {client.lastName} - {client.accountNumber}
        </li>
      ))}
    </ul>
  )
}
```

### Updating Client Information

```typescript
'use client'

import { useClient, useUpdateClient } from '@/features/clients/hooks/use-clients'

export function ClientDetail({ clientId }: { clientId: string }) {
  const { data: client, isLoading } = useClient(clientId)
  const updateClient = useUpdateClient(clientId)

  const handleUpdate = async () => {
    await updateClient.mutateAsync({
      phoneNumber: '987-654-3210'
    })
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <h1>{client?.firstName} {client?.lastName}</h1>
      <p>Phone: {client?.phoneNumber}</p>
      <button onClick={handleUpdate}>Update Phone</button>
    </div>
  )
}
```

### Searching Clients

```typescript
'use client'

import { useState } from 'react'
import { useClients } from '@/features/clients/hooks/use-clients'

export function ClientSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const { data, isLoading } = useClients(1, 25, {
    search: searchTerm
  })

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search clients..."
      />
      {isLoading ? (
        <div>Searching...</div>
      ) : (
        <ul>
          {data?.data.map(client => (
            <li key={client.id}>
              {client.firstName} {client.lastName} - {client.accountNumber}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

## Testing

### Running Tests

```bash
# Run all client module tests
pnpm test src/features/clients

# Run tests in watch mode
pnpm test:watch src/features/clients

# Run tests with coverage
pnpm test:coverage src/features/clients
```

### Test Structure

Tests are organized alongside the code they test:

```
src/features/clients/
├── types.ts
├── __tests__/
│   └── types.test.ts
├── components/
│   ├── client-table.tsx
│   └── __tests__/
│       └── client-table.test.tsx
└── hooks/
    ├── use-clients.ts
    └── __tests__/
        └── use-clients.test.ts
```

## Performance Considerations

1. **Pagination**: Always use pagination for client lists to avoid loading large datasets.

2. **Search Optimization**: The search functionality uses database indexes for efficient searching.

3. **Caching**: Client data is cached using TanStack Query to reduce unnecessary API calls.

4. **Bulk Operations**: For updating multiple clients, use bulk operations to reduce database round trips.

## Troubleshooting

### Common Issues

#### Client Not Found

If you're getting a "client not found" error:
1. Verify the client ID is correct
2. Check if the client is marked as inactive
3. Verify you have permission to view the client

#### Update Failed

If client updates are failing:
1. Check if you have the `clients:update` permission
2. Verify the data meets validation rules
3. Check the error message for specific validation failures

#### Search Not Working

If search is not returning expected results:
1. Verify the search term is not empty
2. Check if the client exists in the database
3. Verify the search term matches the expected fields

## Future Enhancements

Potential improvements for the Client Management module:

1. **Advanced Search**: Add more sophisticated search capabilities with filters for multiple fields
2. **Bulk Import**: Implement functionality to import clients from CSV/Excel files
3. **Client History**: Track all changes to client information over time
4. **Client Relationships**: Add support for related clients (e.g., spouses, dependents)
5. **Document Management**: Add ability to upload and manage client documents
6. **Client Notes**: Add notes and comments for internal communication
7. **Client Tags**: Add tagging system for categorizing clients
8. **Advanced Filtering**: Add more filter options for complex queries
