"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, LogOut } from "lucide-react";
import {
  useUser,
  useUserPermissions,
  useUserTerritories,
  useUserSessions,
  useRevokeSession,
  useRevokeAllSessions,
} from "@/features/users";
import { UserDetail } from "@/features/users/components/user-detail";
import { PermissionEditor } from "@/features/users/components/permission-editor";
import { TerritoryEditor } from "@/features/users/components/territory-editor";
import { UserCreationForm } from "@/features/users";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ScrollArea } from "@/components/ui/scroll-area";

type Tab = "overview" | "permissions" | "territories" | "sessions";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: userId } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isEditing, setIsEditing] = useState(false);

  // Check if this is a new user creation page
  const isNewUser = userId === "new";

  const {
    data: userData,
    isLoading: isUserLoading,
    error: userError,
  } = useUser(userId, { enabled: !isNewUser });
  const { data: permissionsData, isLoading: isPermissionsLoading } =
    useUserPermissions(userId, undefined, { enabled: !isNewUser });
  const { data: territoriesData, isLoading: isTerritoriesLoading } =
    useUserTerritories(userId, { enabled: !isNewUser });
  const {
    data: sessionsData,
    isLoading: isSessionsLoading,
    refetch: refetchSessions,
  } = useUserSessions(userId, { enabled: !isNewUser });

  const revokeSessionMutation = useRevokeSession(userId, {
    onSuccess: () => {
      refetchSessions();
    },
  });

  const revokeAllSessionsMutation = useRevokeAllSessions(userId, {
    onSuccess: () => {
      refetchSessions();
    },
  });

  const handleRevokeSession = (sessionId: string) => {
    revokeSessionMutation.mutate(sessionId);
  };

  const handleRevokeAllSessions = () => {
    if (
      confirm("Are you sure you want to revoke all sessions for this user?")
    ) {
      revokeAllSessionsMutation.mutate();
    }
  };

  const user = userData?.data;
  const permissions = permissionsData?.data || [];
  const territories = territoriesData?.data || { areas: [], branches: [] };
  const sessions = sessionsData?.data || [];

  const tabs = [
    { id: "overview" as Tab, label: "Overview" },
    { id: "permissions" as Tab, label: "Permissions" },
    { id: "territories" as Tab, label: "Territories" },
    { id: "sessions" as Tab, label: "Sessions" },
  ];

  // Render create user form for new users
  if (isNewUser) {
    return (
      <div className="container mx-auto py-8">
        {/* Breadcrumb */}
        <div className="text-muted-foreground mb-6 flex items-center gap-2 text-sm">
          <Link href="/admin/users" className="hover:text-foreground">
            Users
          </Link>
          <span>/</span>
          <span className="text-foreground">Add New User</span>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/users">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">Add New User</h1>
              <p className="text-muted-foreground">
                Create a new user account with permissions and territories
              </p>
            </div>
          </div>
        </div>

        {/* Create User Form */}
        <UserCreationForm />
      </div>
    );
  }

  if (isUserLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner className="size-8" />
        </div>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12">
            <p className="text-destructive text-center">{userError.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground text-center">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Breadcrumb */}
      <div className="text-muted-foreground mb-6 flex items-center gap-2 text-sm">
        <Link href="/admin/users" className="hover:text-foreground">
          Users
        </Link>
        <span>/</span>
        <span className="text-foreground">{user.email}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email}
            </h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={user.isActive ? "default" : "secondary"}>
            {user.isActive ? "Active" : "Inactive"}
          </Badge>
          {activeTab === "overview" && (
            <Button onClick={() => setIsEditing(!isEditing)}>
              <Edit className="mr-2 size-4" />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsEditing(false);
              }}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <UserDetail
          user={user}
          isLoading={isUserLoading}
          onEdit={() => setIsEditing(true)}
        />
      )}

      {activeTab === "permissions" && (
        <div className="space-y-6">
          {isEditing ? (
            <PermissionEditor
              availablePermissions={[]} // TODO: Fetch available permissions
              userPermissions={permissions}
              isLoading={isPermissionsLoading}
              onSave={() => {
                // TODO: Implement save
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Permissions</CardTitle>
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 size-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isPermissionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner className="size-8" />
                  </div>
                ) : permissions.length === 0 ? (
                  <p className="text-muted-foreground">
                    No permissions assigned
                  </p>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {permissions.map((userPermission) => (
                        <div
                          key={userPermission.permissionId}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div>
                            <p className="font-medium">
                              {userPermission.permission.resource}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {userPermission.permission.action}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {userPermission.scope}
                            </Badge>
                            {userPermission.company && (
                              <span className="text-muted-foreground text-sm">
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
          )}
        </div>
      )}

      {activeTab === "territories" && (
        <div className="space-y-6">
          {isEditing ? (
            <TerritoryEditor
              availableAreas={[]} // TODO: Fetch available areas
              availableBranches={[]} // TODO: Fetch available branches
              userAreas={territories.areas}
              userBranches={territories.branches}
              isLoading={isTerritoriesLoading}
              onSave={() => {
                // TODO: Implement save
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Territories</CardTitle>
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 size-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isTerritoriesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner className="size-8" />
                  </div>
                ) : territories.areas.length === 0 &&
                  territories.branches.length === 0 ? (
                  <p className="text-muted-foreground">
                    No territories assigned
                  </p>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {/* Areas */}
                    <div>
                      <h4 className="mb-3 font-medium">Areas</h4>
                      {territories.areas.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No areas assigned
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {territories.areas.map((userArea) => (
                            <div
                              key={userArea.areaId}
                              className="rounded-lg border p-4"
                            >
                              <p className="font-medium">
                                {userArea.area.name}
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {userArea.area.code}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Branches */}
                    <div>
                      <h4 className="mb-3 font-medium">Branches</h4>
                      {territories.branches.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No branches assigned
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {territories.branches.map((userBranch) => (
                            <div
                              key={userBranch.branchId}
                              className="rounded-lg border p-4"
                            >
                              <p className="font-medium">
                                {userBranch.branch.name}
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {userBranch.branch.code}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "sessions" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Sessions</CardTitle>
              {sessions.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleRevokeAllSessions}
                  disabled={revokeAllSessionsMutation.isPending}
                >
                  <LogOut className="mr-2 size-4" />
                  Revoke All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isSessionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner className="size-8" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-muted-foreground">No active sessions</p>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          Created:{" "}
                          {new Date(session.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {session.ipAddress && (
                          <p className="text-muted-foreground text-sm">
                            IP: {session.ipAddress}
                          </p>
                        )}
                        {session.userAgent && (
                          <p className="text-muted-foreground truncate text-sm">
                            {session.userAgent}
                          </p>
                        )}
                        {session.revokedAt && (
                          <Badge variant="destructive" className="mt-2">
                            Revoked: {session.revokedReason || "No reason"}
                          </Badge>
                        )}
                      </div>
                      {!session.revokedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokeSessionMutation.isPending}
                        >
                          <LogOut className="mr-2 size-4" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
