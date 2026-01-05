# DTT Framework - State Management

## Overview

The DTT Framework uses a dual state management approach:

1. **TanStack Query** for server state (data from APIs, databases)
2. **Zustand** for client state (UI state, temporary data)

This separation of concerns provides a clear mental model and optimal performance.

### Why This Approach?

| State Type | Solution | Why |
|------------|-----------|------|
| **Server State** | TanStack Query | Caching, synchronization, background updates, deduplication |
| **Client State** | Zustand | Simple, lightweight, no boilerplate, no context re-renders |

---

## TanStack Query for Server State

### What is TanStack Query?

[TanStack Query](https://tanstack.com/query/latest) (formerly React Query) is a powerful data synchronization library for React. It handles:

- **Fetching**: Data fetching with loading states
- **Caching**: Automatic caching and cache invalidation
- **Synchronization**: Keeping data fresh with refetching
- **Deduplication**: Avoiding duplicate requests
- **Background Updates**: Silent refetching in the background

### Installation

```bash
pnpm add @tanstack/react-query
```

### Setup

**Create Query Client**

Located at [`src/app/providers.tsx`](../../src/app/providers.tsx):

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/nextjs'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { 
      queries: { 
        staleTime: 60 * 1000, // Data is fresh for 60 seconds
        retry: 1 // Retry failed requests once
      } 
    },
  }))

  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ClerkProvider>
  )
}
```

**Wrap App with Providers**

```typescript
// src/app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Basic Usage

**useQuery Hook**

```typescript
import { useQuery } from '@tanstack/react-query'

function UsersList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      return response.json()
    },
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      {data?.users?.map(user => (
        <div key={user.id}>{user.email}</div>
      ))}
    </div>
  )
}
```

**useMutation Hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

function CreateUserForm() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (userData: { name: string; email: string }) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      if (!response.ok) throw new Error('Failed to create user')
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch users query
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    mutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" />
      <input name="email" placeholder="Email" />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  )
}
```

### Query Keys

Query keys are used to identify and manage queries:

```typescript
// Simple key
useQuery({ queryKey: ['users'], queryFn: fetchUsers })

// Key with parameters
useQuery({ 
  queryKey: ['user', userId], 
  queryFn: () => fetchUser(userId) 
})

// Complex key
useQuery({ 
  queryKey: ['posts', { page, limit }], 
  queryFn: () => fetchPosts(page, limit) 
})
```

### Cache Invalidation

```typescript
const queryClient = useQueryClient()

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ['users'] })

// Invalidate all queries
queryClient.invalidateQueries()

// Invalidate queries matching a predicate
queryClient.invalidateQueries({
  predicate: (query) => query.queryKey[0] === 'users'
})
```

### Prefetching

```typescript
const queryClient = useQueryClient()

// Prefetch data before it's needed
useEffect(() => {
  queryClient.prefetchQuery({
    queryKey: ['user', nextUserId],
    queryFn: () => fetchUser(nextUserId),
  })
}, [nextUserId])
```

### Custom Hooks

Located at [`src/hooks/queries/use-health-checks.ts`](../../src/hooks/queries/use-health-checks.ts):

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

export function useHealthChecks() {
  return useQuery({
    queryKey: ['health-checks'],
    queryFn: async () => {
      const response = await fetch('/api/health/all')
      if (!response.ok) throw new Error('Failed to fetch health checks')
      return response.json()
    },
  })
}
```

**Usage:**

```typescript
import { useHealthChecks } from '@/hooks/queries/use-health-checks'

function HealthPage() {
  const { data, isLoading, error, refetch } = useHealthChecks()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>{/* Render health checks */}</div>
}
```

---

## Zustand for Client State

### What is Zustand?

[Zustand](https://zustand-demo.pmnd.rs/) is a small, fast, and scalable state management solution. It provides:

- **Simple API**: Minimal boilerplate
- **No Context**: Avoids unnecessary re-renders
- **TypeScript Support**: Full type safety
- **DevTools**: Built-in DevTools integration
- **Middleware**: Composable middleware

### Installation

```bash
pnpm add zustand
```

### Basic Usage

**Create a Store**

Located at [`src/stores/ui-store.ts`](../../src/stores/ui-store.ts):

```typescript
'use client'

import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
```

**Use the Store**

```typescript
import { useUIStore } from '@/stores/ui-store'

function Sidebar() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)

  return (
    <div>
      <button onClick={toggleSidebar}>Toggle Sidebar</button>
      {sidebarOpen && <div>Sidebar Content</div>}
    </div>
  )
}
```

### Advanced Patterns

**Multiple Selectors**

```typescript
// Select multiple state values
const { sidebarOpen, theme } = useUIStore((state) => ({
  sidebarOpen: state.sidebarOpen,
  theme: state.theme,
}))
```

**Actions**

```typescript
interface UIState {
  // State
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  
  // Actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  theme: 'light',
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
}))
```

**Async Actions**

```typescript
interface DataState {
  data: any[]
  loading: boolean
  error: string | null
  fetchData: () => Promise<void>
}

export const useDataStore = create<DataState>((set) => ({
  data: [],
  loading: false,
  error: null,
  
  fetchData: async () => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/data')
      const data = await response.json()
      set({ data, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },
}))
```

**Middleware**

```typescript
import { devtools, persist } from 'zustand/middleware'

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: false,
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      }),
      { name: 'ui-storage' }
    )
  )
)
```

### Slices

For larger stores, you can use slices:

```typescript
// slices/sidebarSlice.ts
import { create } from 'zustand'

export const createSidebarSlice = (set: any) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state: any) => ({ sidebarOpen: !state.sidebarOpen })),
})

// slices/themeSlice.ts
export const createThemeSlice = (set: any) => ({
  theme: 'light' as 'light' | 'dark',
  setTheme: (theme: 'light' | 'dark') => set({ theme }),
})

// index.ts
import { create } from 'zustand'
import { createSidebarSlice } from './slices/sidebarSlice'
import { createThemeSlice } from './slices/themeSlice'

export const useUIStore = create<UIState>((set) => ({
  ...createSidebarSlice(set),
  ...createThemeSlice(set),
}))
```

---

## Usage Patterns and Examples

### Pattern 1: Fetch and Display Data

```typescript
import { useQuery } from '@tanstack/react-query'

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading user</div>

  return (
    <div>
      <h1>{data.user.name}</h1>
      <p>{data.user.email}</p>
    </div>
  )
}
```

### Pattern 2: Create and Invalidate

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

function CreateUserForm() {
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: (userData: any) => 
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    mutation.mutate({
      name: formData.get('name'),
      email: formData.get('email'),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <input name="email" required />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  )
}
```

### Pattern 3: Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['todos'] })
    
    // Snapshot previous value
    const previousTodos = queryClient.getQueryData(['todos'])
    
    // Optimistically update
    queryClient.setQueryData(['todos'], (old: any) => 
      old?.map((todo: any) => 
        todo.id === newTodo.id ? { ...todo, ...newTodo } : todo
      )
    )
    
    return { previousTodos }
  },
  onError: (err, newTodo, context) => {
    // Rollback on error
    queryClient.setQueryData(['todos'], context?.previousTodos)
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

### Pattern 4: UI State with Zustand

```typescript
import { useUIStore } from '@/stores/ui-store'

function Header() {
  const { sidebarOpen, toggleSidebar, theme, setTheme } = useUIStore()

  return (
    <header>
      <button onClick={toggleSidebar}>
        {sidebarOpen ? 'Close' : 'Open'} Sidebar
      </button>
      <select 
        value={theme} 
        onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </header>
  )
}
```

### Pattern 5: Combining Both

```typescript
function TodoApp() {
  // Server state from API
  const { data: todos, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  // Client state for UI
  const { filter, setFilter } = useTodoStore()

  // Filter todos based on UI state
  const filteredTodos = todos?.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  return (
    <div>
      <div>
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('active')}>Active</button>
        <button onClick={() => setFilter('completed')}>Completed</button>
      </div>
      {isLoading ? <div>Loading...</div> : (
        <ul>
          {filteredTodos?.map(todo => (
            <li key={todo.id}>{todo.title}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## Best Practices

### TanStack Query

1. **Use meaningful query keys**: Structure keys to reflect data hierarchy
2. **Set appropriate stale time**: Balance freshness and performance
3. **Use mutations for writes**: Separate reads from writes
4. **Invalidate after mutations**: Keep cache in sync
5. **Use custom hooks**: Reuse query logic across components

### Zustand

1. **Keep stores focused**: One store per domain
2. **Use selectors**: Subscribe only to needed state
3. **Avoid putting server state in Zustand**: Use TanStack Query instead
4. **Use middleware when needed**: DevTools, persistence, etc.

---

## Related Documentation

- [API Layer](./api-layer.md) - API endpoints for data fetching
- [Health Check System](./health-check-system.md) - Health check data fetching
- [Clerk Authentication](./clerk-authentication.md) - Authentication state
