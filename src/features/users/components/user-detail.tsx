'use client'

import { Calendar, Lock, Shield, MapPin, Activity } from 'lucide-react'
import type { UserWithDetails, UserSession } from '../types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent, CardAction } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface UserDetailProps {
  user: UserWithDetails | null
  isLoading?: boolean
  error?: string | null
  onEdit?: () => void
  onRevokeSession?: (sessionId: string) => void
  isRevokingSession?: boolean
}

export function UserDetail({
  user,
  isLoading,
  error,
  onEdit,
  onRevokeSession,
  isRevokingSession,
}: UserDetailProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner className="size-8" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">User not found</p>
        </CardContent>
      </Card>
    )
  }

  const fullName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : 'N/A'

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={fullName}
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-semibold">
                {user.firstName?.[0] || (user.email?.[0] || '').toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <CardTitle>{fullName}</CardTitle>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={user.isActive ? 'default' : 'secondary'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {user.mustChangePassword && (
                  <Badge variant="destructive">
                    <Lock className="mr-1 size-3" />
                    Must Change Password
                  </Badge>
                )}
              </div>
            </div>
            <CardAction>
              {onEdit && (
                <Button onClick={onEdit}>Edit User</Button>
              )}
            </CardAction>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Member Since</p>
              <p className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Last Login</p>
              <p className="flex items-center gap-2">
                <Activity className="size-4 text-muted-foreground" />
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Never'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Logins</p>
              <p className="flex items-center gap-2">
                <Activity className="size-4 text-muted-foreground" />
                {user.loginCount}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Failed Attempts</p>
              <p className="flex items-center gap-2">
                <Lock className="size-4 text-muted-foreground" />
                {user.failedLoginCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.permissions.length === 0 ? (
            <p className="text-muted-foreground">No permissions assigned</p>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {user.permissions.map((userPermission) => (
                  <div
                    key={userPermission.permissionId}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{userPermission.permission.resource}</p>
                      <p className="text-sm text-muted-foreground">
                        {userPermission.permission.action}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{userPermission.scope}</Badge>
                      {userPermission.company && (
                        <span className="text-sm text-muted-foreground">
                          {userPermission.company.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Territories Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-5" />
            Territories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Areas */}
            <div>
              <h4 className="mb-3 font-medium">Areas</h4>
              {user.areas.length === 0 ? (
                <p className="text-sm text-muted-foreground">No areas assigned</p>
              ) : (
                <div className="space-y-2">
                  {user.areas.map((userArea) => (
                    <div
                      key={userArea.areaId}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{userArea.area.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {userArea.area.code}
                        </p>
                      </div>
                      {userArea.area.company && (
                        <span className="text-sm text-muted-foreground">
                          {userArea.area.company.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Branches */}
            <div>
              <h4 className="mb-3 font-medium">Branches</h4>
              {user.branches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No branches assigned</p>
              ) : (
                <div className="space-y-2">
                  {user.branches.map((userBranch) => (
                    <div
                      key={userBranch.branchId}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{userBranch.branch.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {userBranch.branch.code}
                        </p>
                      </div>
                      {userBranch.branch.location && (
                        <span className="text-sm text-muted-foreground">
                          {userBranch.branch.location}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
