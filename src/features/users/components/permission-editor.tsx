"use client";

import { useState } from "react";
import { Check, Shield } from "lucide-react";
import type { Permission, UserPermission } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

interface PermissionGroup {
  resource: string;
  permissions: Permission[];
}

interface PermissionEditorProps {
  availablePermissions: Permission[];
  userPermissions: UserPermission[];
  isLoading?: boolean;
  onSave: (
    permissions: Array<{
      permissionId: string;
      companyId: string;
      scope: "self" | "all" | "team" | "branch" | "area";
    }>,
  ) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function PermissionEditor({
  availablePermissions,
  userPermissions,
  isLoading,
  onSave,
  onCancel,
  isSaving,
}: PermissionEditorProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(userPermissions.map((up) => up.permissionId)),
  );
  const [scopes, setScopes] = useState<
    Record<string, "self" | "all" | "team" | "branch" | "area">
  >(
    userPermissions.reduce(
      (acc, up) => {
        acc[up.permissionId] = up.scope;
        return acc;
      },
      {} as Record<string, "self" | "all" | "team" | "branch" | "area">,
    ),
  );

  // Group permissions by resource
  const groupedPermissions = availablePermissions.reduce(
    (acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  const handleScopeChange = (
    permissionId: string,
    scope: "self" | "all" | "team" | "branch" | "area",
  ) => {
    setScopes((prev) => ({
      ...prev,
      [permissionId]: scope,
    }));
  };

  const handleSave = () => {
    const permissions = Array.from(selectedPermissions).map((permissionId) => ({
      permissionId,
      companyId: "default", // TODO: Get from context or user selection
      scope: scopes[permissionId] || "self",
    }));
    onSave(permissions);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner className="size-8" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5" />
          Edit Permissions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groupedPermissions).map(([resource, permissions]) => (
            <Collapsible key={resource} defaultOpen>
              <CollapsibleTrigger asChild>
                <button className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border p-4 text-left">
                  <span className="font-semibold">{resource}</span>
                  <Badge variant="outline">
                    {
                      permissions.filter((p) => selectedPermissions.has(p.id))
                        .length
                    }{" "}
                    / {permissions.length}
                  </Badge>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2 pl-4">
                  {permissions.map((permission) => {
                    const isSelected = selectedPermissions.has(permission.id);
                    const scope = scopes[permission.id] || "self";

                    return (
                      <div
                        key={permission.id}
                        className={`rounded-lg border p-4 transition-colors ${
                          isSelected ? "bg-primary/5 border-primary" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleTogglePermission(permission.id)
                              }
                              className={`mt-0.5 flex size-5 items-center justify-center rounded border transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-input hover:border-primary"
                              }`}
                            >
                              {isSelected && <Check className="size-3.5" />}
                            </button>
                            <div className="flex-1">
                              <p className="font-medium">{permission.action}</p>
                              {permission.description && (
                                <p className="text-muted-foreground mt-1 text-sm">
                                  {permission.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={`scope-${permission.id}`}
                                className="text-sm font-medium"
                              >
                                Scope:
                              </label>
                              <select
                                id={`scope-${permission.id}`}
                                value={scope}
                                onChange={(e) =>
                                  handleScopeChange(
                                    permission.id,
                                    e.target.value as
                                      | "self"
                                      | "all"
                                      | "team"
                                      | "branch"
                                      | "area",
                                  )
                                }
                                className="border-input bg-background focus-visible:ring-ring rounded-md border px-3 py-1.5 text-sm outline-none focus-visible:ring-2"
                              >
                                <option value="self">Self</option>
                                <option value="team">Team</option>
                                <option value="branch">Branch</option>
                                <option value="area">Area</option>
                                <option value="all">All</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedPermissions.size === 0}
          >
            {isSaving ? (
              <>
                <LoadingSpinner className="mr-2 size-4" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
