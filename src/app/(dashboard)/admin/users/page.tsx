'use client'

import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useUsers } from '@/features/users/hooks/use-users'
import { UserTable } from '@/features/users/components/user-table'
import { Button } from '@/components/ui/button'

export default function UsersPage() {
  const { data, isLoading, error } = useUsers()

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts, permissions, and territories.
          </p>
        </div>
        <Link href="/admin/users/new">
          <Button>
            <Plus className="mr-2 size-4" />
            Add User
          </Button>
        </Link>
      </div>

      <UserTable
        users={data?.data}
        isLoading={isLoading}
        error={error?.message}
      />
    </div>
  )
}
