'use client'

import { useState } from 'react'
import { Building2, Plus, Trash2, Star, Loader2, Check } from 'lucide-react'
import type { Area, AreaBranch } from '../types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useAreaBranches,
  useAssignBranchesToArea,
  useRemoveBranchFromArea,
  useSetPrimaryBranch,
} from '../hooks/use-areas'
import { useBranches } from '@/features/branches/hooks/use-branches'

interface AreaBranchesDialogProps {
  area: Area | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AreaBranchesDialog({
  area,
  open,
  onOpenChange,
}: AreaBranchesDialogProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([])
  
  const { data: areaBranches, isLoading } = useAreaBranches(area?.id || '', {
    enabled: !!area?.id && open,
  })
  
  const { data: allBranches } = useBranches(undefined, 100, { isActive: true })
  
  const assignBranchesMutation = useAssignBranchesToArea({
    onSuccess: () => {
      setShowAddForm(false)
      setSelectedBranchIds([])
    },
  })
  
  const removeBranchMutation = useRemoveBranchFromArea()
  
  const setPrimaryBranchMutation = useSetPrimaryBranch()

  const handleAssignBranches = async () => {
    if (!area || selectedBranchIds.length === 0) {
      return
    }

    assignBranchesMutation.mutate({
      areaId: area.id,
      branchIds: selectedBranchIds,
      replaceExisting: false,
    })
  }

  const handleRemoveBranch = (areaBranch: AreaBranch) => {
    if (!area) return
    
    if (confirm('Are you sure you want to remove this branch from the area?')) {
      removeBranchMutation.mutate({
        areaId: area.id,
        branchId: areaBranch.branchId,
      })
    }
  }

  const handleSetPrimary = (areaBranch: AreaBranch) => {
    if (!area) return
    
    setPrimaryBranchMutation.mutate({
      areaId: area.id,
      branchId: areaBranch.branchId,
    })
  }

  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Area Branches</DialogTitle>
          <DialogDescription>
            Manage branch assignments for {area?.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {showAddForm && (
                <div className="space-y-4 rounded-lg border p-4">
                  <div>
                    <Label className="mb-2 block">Select Branches to Add</Label>
                    <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-2">
                      {allBranches?.data?.filter(
                        (branch) => !areaBranches?.some((ab) => ab.branchId === branch.id)
                      ).map((branch) => (
                        <div
                          key={branch.id}
                          className="flex items-center gap-2 rounded border p-2"
                        >
                          <input
                            type="checkbox"
                            id={`branch-${branch.id}`}
                            checked={selectedBranchIds.includes(branch.id)}
                            onChange={() => toggleBranchSelection(branch.id)}
                            className="h-4 w-4"
                          />
                          <Label
                            htmlFor={`branch-${branch.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{branch.name}</p>
                                <p className="text-sm text-muted-foreground">{branch.code}</p>
                              </div>
                            </div>
                          </Label>
                        </div>
                      ))}
                      {allBranches?.data?.filter(
                        (branch) => !areaBranches?.some((ab) => ab.branchId === branch.id)
                      ).length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          No available branches to add.
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false)
                        setSelectedBranchIds([])
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAssignBranches}
                      disabled={assignBranchesMutation.isPending || selectedBranchIds.length === 0}
                    >
                      {assignBranchesMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Selected ({selectedBranchIds.length})
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              {!showAddForm && (
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Branches
                </Button>
              )}
              
              {areaBranches && areaBranches.length > 0 && (
                <div className="space-y-2">
                  {areaBranches.map((areaBranch) => (
                    <div
                      key={areaBranch.id}
                      className="flex items-start justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Building2 className="mt-1 h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{areaBranch.branch?.name}</p>
                            {areaBranch.isPrimary && (
                              <Star className="h-4 w-4 fill-primary text-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {areaBranch.branch?.code}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Primary: {areaBranch.isPrimary ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!areaBranch.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimary(areaBranch)}
                            title="Set as primary"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBranch(areaBranch)}
                          title="Remove branch"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {areaBranches && areaBranches.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No branches assigned to this area. Add branches above.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
