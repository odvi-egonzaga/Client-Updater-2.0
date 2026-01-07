"use client";

import { useState } from "react";
import { Check, MapPin, ChevronDown, ChevronRight } from "lucide-react";
import type { Area, Branch, UserArea, UserBranch } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

interface TerritoryEditorProps {
  availableAreas: Area[];
  availableBranches: Branch[];
  userAreas: UserArea[];
  userBranches: UserBranch[];
  isLoading?: boolean;
  onSave: (territories: { areaIds?: string[]; branchIds?: string[] }) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function TerritoryEditor({
  availableAreas,
  availableBranches,
  userAreas,
  userBranches,
  isLoading,
  onSave,
  onCancel,
  isSaving,
}: TerritoryEditorProps) {
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<string>>(
    new Set(userAreas.map((ua) => ua.areaId)),
  );
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(
    new Set(userBranches.map((ub) => ub.branchId)),
  );
  const [areasOpen, setAreasOpen] = useState(true);
  const [branchesOpen, setBranchesOpen] = useState(true);

  const handleToggleArea = (areaId: string) => {
    setSelectedAreaIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(areaId)) {
        newSet.delete(areaId);
      } else {
        newSet.add(areaId);
      }
      return newSet;
    });
  };

  const handleToggleBranch = (branchId: string) => {
    setSelectedBranchIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(branchId)) {
        newSet.delete(branchId);
      } else {
        newSet.add(branchId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    onSave({
      areaIds: Array.from(selectedAreaIds),
      branchIds: Array.from(selectedBranchIds),
    });
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
          <MapPin className="size-5" />
          Edit Territories
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Areas Section */}
          <Collapsible open={areasOpen} onOpenChange={setAreasOpen}>
            <CollapsibleTrigger asChild>
              <button className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border p-4 text-left">
                <div className="flex items-center gap-2">
                  {areasOpen ? (
                    <ChevronDown className="text-muted-foreground size-4" />
                  ) : (
                    <ChevronRight className="text-muted-foreground size-4" />
                  )}
                  <span className="font-semibold">Areas</span>
                </div>
                <Badge variant="outline">
                  {selectedAreaIds.size} / {availableAreas.length}
                </Badge>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2 pl-4">
                {availableAreas.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No areas available
                  </p>
                ) : (
                  availableAreas.map((area) => {
                    const isSelected = selectedAreaIds.has(area.id);

                    return (
                      <div
                        key={area.id}
                        className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                          isSelected ? "bg-primary/5 border-primary" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleArea(area.id)}
                            className={`mt-0.5 flex size-5 items-center justify-center rounded border transition-colors ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input hover:border-primary"
                            }`}
                          >
                            {isSelected && <Check className="size-3.5" />}
                          </button>
                          <div className="flex-1">
                            <p className="font-medium">{area.name}</p>
                            <p className="text-muted-foreground text-sm">
                              {area.code}
                            </p>
                            {area.company && (
                              <p className="text-muted-foreground mt-1 text-sm">
                                {area.company.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Branches Section */}
          <Collapsible open={branchesOpen} onOpenChange={setBranchesOpen}>
            <CollapsibleTrigger asChild>
              <button className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border p-4 text-left">
                <div className="flex items-center gap-2">
                  {branchesOpen ? (
                    <ChevronDown className="text-muted-foreground size-4" />
                  ) : (
                    <ChevronRight className="text-muted-foreground size-4" />
                  )}
                  <span className="font-semibold">Branches</span>
                </div>
                <Badge variant="outline">
                  {selectedBranchIds.size} / {availableBranches.length}
                </Badge>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2 pl-4">
                {availableBranches.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No branches available
                  </p>
                ) : (
                  availableBranches.map((branch) => {
                    const isSelected = selectedBranchIds.has(branch.id);

                    return (
                      <div
                        key={branch.id}
                        className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                          isSelected ? "bg-primary/5 border-primary" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleBranch(branch.id)}
                            className={`mt-0.5 flex size-5 items-center justify-center rounded border transition-colors ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input hover:border-primary"
                            }`}
                          >
                            {isSelected && <Check className="size-3.5" />}
                          </button>
                          <div className="flex-1">
                            <p className="font-medium">{branch.name}</p>
                            <p className="text-muted-foreground text-sm">
                              {branch.code}
                            </p>
                            {branch.location && (
                              <p className="text-muted-foreground mt-1 text-sm">
                                {branch.location}
                              </p>
                            )}
                            {branch.category && (
                              <Badge variant="outline" className="mt-2">
                                {branch.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
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
