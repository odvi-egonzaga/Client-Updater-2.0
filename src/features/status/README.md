# Status Tracking Module

This module handles client status tracking, including status updates, validation, workflow rules, and history tracking.

## Overview

The Status Tracking module provides comprehensive functionality for managing client status changes, including:
- Status updates with validation
- Status history tracking
- Workflow rules enforcement
- Bulk status updates
- Status summary statistics

## File Structure

```
src/features/status/
├── types.ts                    # TypeScript type definitions
├── validation.ts               # Status validation logic
├── period-init.ts             # Period initialization utilities
├── components/                # Status-related UI components
│   ├── status-table.tsx       # Table component for status list
│   ├── status-detail.tsx       # Status detail view component
│   └── status-form.tsx        # Form for status updates
├── hooks/                     # Custom React hooks
│   └── use-status.ts          # Hook for status data fetching and mutations
└── __tests__/                 # Test files
    ├── types.test.ts          # Type definition tests
    ├── validation.test.ts      # Validation logic tests
    └── components.test.tsx    # Component tests
```

## Key Functions

### Status Types

```typescript
interface Status {
  id: string
  clientId: string
  statusTypeId: string
  statusReasonId?: string
  remarks?: string
  updatedBy: string
  updatedAt: Date
  period: string
}

interface StatusType {
  id: string
  code: string
  name: string
  sequence: number
  companyId?: string
  isSystem: boolean
}

interface StatusReason {
  id: string
  code: string
  name: string
  statusTypeId: string
  isTerminal: boolean
  requiresRemarks: boolean
  isSystem: boolean
}

interface StatusHistory {
  id: string
  clientId: string
  statusTypeId: string
  statusReasonId?: string
  remarks?: string
  updatedBy: string
  updatedAt: Date
  period: string
}
```

### Status Hooks

#### `useStatusSummary(filters?, options?)`

Fetches status summary statistics.

**Parameters:**
- `filters` (StatusFilters, optional): Filter criteria
- `options` (UseQueryOptions, optional): Additional TanStack Query options

**Returns:**
- `data`: Status summary statistics
- `isLoading`: Loading state
- `error`: Error object if request failed

**Example:**
```typescript
const { data, isLoading, error } = useStatusSummary({
  companyId: 'fcash-id',
  period: '2024-01'
})
```

#### `useClientStatus(clientId, options?)`

Fetches current status for a client.

**Parameters:**
- `clientId` (string): Client ID
- `options` (UseQueryOptions, optional): Additional TanStack Query options

**Returns:**
- `data`: Current client status
- `isLoading`: Loading state
- `error`: Error object if request failed

**Example:**
```typescript
const { data, isLoading, error } = useClientStatus('client-id')
```

#### `useStatusHistory(clientId, options?)`

Fetches status history for a client.

**Parameters:**
- `clientId` (string): Client ID
- `options` (UseQueryOptions, optional): Additional TanStack Query options

**Returns:**
- `data`: Array of status history records
- `isLoading`: Loading state
- `error`: Error object if request failed

**Example:**
```typescript
const { data, isLoading, error } = useStatusHistory('client-id')
```

#### `useUpdateStatus(options?)`

Mutation hook for updating client status.

**Parameters:**
- `options` (UseMutationOptions, optional): Additional mutation options

**Returns:**
- `mutate`: Function to trigger the mutation
- `isPending`: Mutation loading state
- `error`: Error object if mutation failed
- `data`: Updated status data

**Example:**
```typescript
const updateStatus = useUpdateStatus()

updateStatus.mutate({
  clientId: 'client-id',
  statusTypeId: 'status-id',
  statusReasonId: 'reason-id',
  remarks: 'Client visited'
})
```

#### `useBulkUpdateStatus(options?)`

Mutation hook for bulk updating client status.

**Parameters:**
- `options` (UseMutationOptions, optional): Additional mutation options

**Returns:**
- `mutate`: Function to trigger the mutation
- `isPending`: Mutation loading state
- `error`: Error object if mutation failed
- `data`: Bulk update result

**Example:**
```typescript
const bulkUpdateStatus = useBulkUpdateStatus()

bulkUpdateStatus.mutate({
  clientIds: ['client-id-1', 'client-id-2'],
  statusTypeId: 'status-id',
  statusReasonId: 'reason-id',
  remarks: 'Bulk update'
})
```

## API Endpoints

### `GET /api/status/summary`

Gets status summary statistics.

**Query Parameters:**
- `companyId` (string, optional): Filter by company
- `period` (string, optional): Filter by period (format: YYYY-MM)
- `statusTypeId` (string, optional): Filter by status type

**Response:**
```json
{
  "success": true,
  "data": {
    "totalClients": 1000,
    "byStatusType": [
      {
        "statusTypeId": "status-id",
        "statusTypeName": "Pending",
        "count": 200
      }
    ],
    "byCompany": [
      {
        "companyId": "company-id",
        "companyName": "FCASH",
        "count": 500
      }
    ]
  }
}
```

### `GET /api/status/client/:id`

Gets current status for a client.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "status-id",
    "clientId": "client-id",
    "statusTypeId": "status-type-id",
    "statusTypeName": "Pending",
    "statusReasonId": "reason-id",
    "statusReasonName": "Follow-up required",
    "remarks": "Client visited",
    "updatedBy": "user-id",
    "updatedByName": "John Doe",
    "updatedAt": "2024-01-15T10:30:00Z",
    "period": "2024-01"
  }
}
```

### `PATCH /api/status/update`

Updates client status.

**Request Body:**
```json
{
  "clientId": "client-id",
  "statusTypeId": "status-type-id",
  "statusReasonId": "reason-id",
  "remarks": "Client visited"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "status-id",
    "clientId": "client-id",
    "statusTypeId": "status-type-id",
    ...
  }
}
```

### `POST /api/status/bulk-update`

Bulk updates client status.

**Request Body:**
```json
{
  "clientIds": ["client-id-1", "client-id-2"],
  "statusTypeId": "status-type-id",
  "statusReasonId": "reason-id",
  "remarks": "Bulk update"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated": 2,
    "failed": 0,
    "errors": []
  }
}
```

### `GET /api/status/history`

Gets status history for a client.

**Query Parameters:**
- `clientId` (string): Client ID
- `limit` (number, optional): Maximum number of records (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "history-id",
      "clientId": "client-id",
      "statusTypeId": "status-type-id",
      "statusTypeName": "Pending",
      "statusReasonId": "reason-id",
      "statusReasonName": "Follow-up required",
      "remarks": "Client visited",
      "updatedBy": "user-id",
      "updatedByName": "John Doe",
      "updatedAt": "2024-01-15T10:30:00Z",
      "period": "2024-01"
    }
  ]
}
```

## Permissions Required

- `status:read`: View client status
- `status:update`: Update client status
- `status:history:read`: View status history

## Business Rules

### Workflow Rules

1. **Status Sequence**: Status changes must follow the defined sequence. You cannot skip statuses in the workflow.

2. **Terminal Statuses**: Some statuses are terminal and cannot be changed once set:
   - Deceased
   - Fully Paid
   - Account Closed

3. **Required Remarks**: Certain status reasons require remarks:
   - Not Reachable
   - Refused to Update
   - Other non-standard reasons

4. **Period Tracking**: Status changes are tracked by period (YYYY-MM format). Each period represents a month.

5. **One Status per Period**: A client can only have one status per period. Multiple updates in the same period will overwrite previous status.

### Validation Rules

1. **Required Fields**:
   - Client ID
   - Status Type ID

2. **Conditional Fields**:
   - Status Reason ID: Required if status type has reasons
   - Remarks: Required if status reason requires remarks

3. **Status Type Validation**:
   - Status type must exist
   - Status type must be active
   - Status type must be valid for the client's company

4. **Status Reason Validation**:
   - Status reason must exist
   - Status reason must belong to the selected status type
   - Status reason must be active

5. **Workflow Validation**:
   - New status must be valid transition from current status
   - Cannot transition from terminal status (except in special cases)

### Audit Trail

All status changes are logged in the activity log with:
- User who made the change
- Timestamp of the change
- Old status and new status
- Remarks (if provided)
- IP address of the request

## Usage Examples

### Viewing Client Status

```typescript
'use client'

import { useClientStatus } from '@/features/status/hooks/use-status'

export function ClientStatus({ clientId }: { clientId: string }) {
  const { data: status, isLoading, error } = useClientStatus(clientId)

  if (isLoading) return <div>Loading status...</div>
  if (error) return <div>Error loading status</div>

  return (
    <div>
      <h2>Current Status</h2>
      <p>Status: {status?.statusTypeName}</p>
      <p>Reason: {status?.statusReasonName || 'N/A'}</p>
      <p>Remarks: {status?.remarks || 'N/A'}</p>
      <p>Updated: {status?.updatedAt}</p>
    </div>
  )
}
```

### Updating Client Status

```typescript
'use client'

import { useState } from 'react'
import { useUpdateStatus } from '@/features/status/hooks/use-status'

export function StatusUpdateForm({ clientId }: { clientId: string }) {
  const [statusTypeId, setStatusTypeId] = useState('')
  const [statusReasonId, setStatusReasonId] = useState('')
  const [remarks, setRemarks] = useState('')

  const updateStatus = useUpdateStatus()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateStatus.mutateAsync({
      clientId,
      statusTypeId,
      statusReasonId: statusReasonId || undefined,
      remarks: remarks || undefined
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <select
        value={statusTypeId}
        onChange={(e) => setStatusTypeId(e.target.value)}
        required
      >
        <option value="">Select Status</option>
        {/* Status options */}
      </select>
      <select
        value={statusReasonId}
        onChange={(e) => setStatusReasonId(e.target.value)}
      >
        <option value="">Select Reason (optional)</option>
        {/* Reason options */}
      </select>
      <textarea
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Remarks (if required)"
      />
      <button type="submit" disabled={updateStatus.isPending}>
        Update Status
      </button>
    </form>
  )
}
```

### Viewing Status History

```typescript
'use client'

import { useStatusHistory } from '@/features/status/hooks/use-status'

export function StatusHistory({ clientId }: { clientId: string }) {
  const { data: history, isLoading } = useStatusHistory(clientId)

  if (isLoading) return <div>Loading history...</div>

  return (
    <div>
      <h2>Status History</h2>
      <ul>
        {history?.map((record) => (
          <li key={record.id}>
            <p>Status: {record.statusTypeName}</p>
            <p>Reason: {record.statusReasonName || 'N/A'}</p>
            <p>Remarks: {record.remarks || 'N/A'}</p>
            <p>Updated by: {record.updatedByName}</p>
            <p>Date: {record.updatedAt}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### Bulk Status Update

```typescript
'use client'

import { useState } from 'react'
import { useBulkUpdateStatus } from '@/features/status/hooks/use-status'

export function BulkStatusUpdate({ clientIds }: { clientIds: string[] }) {
  const [statusTypeId, setStatusTypeId] = useState('')
  const [statusReasonId, setStatusReasonId] = useState('')
  const [remarks, setRemarks] = useState('')

  const bulkUpdateStatus = useBulkUpdateStatus()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await bulkUpdateStatus.mutateAsync({
      clientIds,
      statusTypeId,
      statusReasonId: statusReasonId || undefined,
      remarks: remarks || undefined
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>Updating {clientIds.length} clients</p>
      <select
        value={statusTypeId}
        onChange={(e) => setStatusTypeId(e.target.value)}
        required
      >
        <option value="">Select Status</option>
        {/* Status options */}
      </select>
      <select
        value={statusReasonId}
        onChange={(e) => setStatusReasonId(e.target.value)}
      >
        <option value="">Select Reason (optional)</option>
        {/* Reason options */}
      </select>
      <textarea
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Remarks (if required)"
      />
      <button type="submit" disabled={bulkUpdateStatus.isPending}>
        Bulk Update Status
      </button>
    </form>
  )
}
```

## Testing

### Running Tests

```bash
# Run all status module tests
pnpm test src/features/status

# Run tests in watch mode
pnpm test:watch src/features/status

# Run tests with coverage
pnpm test:coverage src/features/status
```

### Test Structure

Tests are organized alongside the code they test:

```
src/features/status/
├── types.ts
├── validation.ts
├── __tests__/
│   ├── types.test.ts
│   └── validation.test.ts
├── components/
│   ├── status-table.tsx
│   └── __tests__/
│       └── status-table.test.tsx
└── hooks/
    ├── use-status.ts
    └── __tests__/
        └── use-status.test.ts
```

## Performance Considerations

1. **Pagination**: Always use pagination for status history to avoid loading large datasets.

2. **Caching**: Status data is cached using TanStack Query to reduce unnecessary API calls.

3. **Bulk Operations**: For updating multiple clients, use bulk operations to reduce database round trips.

4. **Indexing**: Status tables are properly indexed for efficient querying by client and period.

## Troubleshooting

### Common Issues

#### Status Update Failed

If status updates are failing:
1. Check if you have the `status:update` permission
2. Verify the status type and reason are valid
3. Check if the workflow rules allow the transition
4. Verify all required fields are provided

#### Invalid Status Transition

If you're getting an invalid status transition error:
1. Check the current status of the client
2. Verify the workflow rules allow the transition
3. Check if the current status is terminal

#### Missing Remarks

If you're getting a missing remarks error:
1. Check if the selected status reason requires remarks
2. Provide remarks for the status update

## Future Enhancements

Potential improvements for the Status Tracking module:

1. **Advanced Workflow Rules**: Implement more sophisticated workflow rules with conditions
2. **Status Notifications**: Send notifications when status changes occur
3. **Status Analytics**: Add advanced analytics and reporting on status trends
4. **Status Predictions**: Use AI to predict likely status outcomes
5. **Status Escalations**: Implement automatic escalation based on status duration
6. **Status Templates**: Create templates for common status updates
7. **Status Approvals**: Add approval workflow for certain status changes
8. **Status SLA Tracking**: Track and report on SLA compliance for status updates
