'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AreaFilters } from '@/features/areas/components/area-filters'
import { AreaTable } from '@/features/areas/components/area-table'
import { AreaFormDialog } from '@/features/areas/components/area-form-dialog'
import { AreaBranchesDialog } from '@/features/areas/components/area-branches-dialog'
import { useAreas } from '@/features/areas/hooks/use-areas'
import { useAreasStore } from '@/features/areas/stores/areas-store'
import type { Area } from '@/features/areas/types'
import { Button } from '@/components/ui/button'

export default function AreasPage() {
  const { isLoading, error } = useAreas()
  const areas = useAreasStore((state) => state.areas)
  const [selectedArea, setSelectedArea] = useState<Area | null>(null)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [isBranchesDialogOpen, setIsBranchesDialogOpen] = useState(false)
  const [branchesArea, setBranchesArea] = useState<Area | null>(null)

  const handleEditArea = (area: Area) => {
    setSelectedArea(area)
    setIsFormDialogOpen(true)
  }

  const handleViewBranches = (area: Area) => {
    setBranchesArea(area)
    setIsBranchesDialogOpen(true)
  }

  const handleCloseFormDialog = () => {
    setIsFormDialogOpen(false)
    setSelectedArea(null)
  }

  const handleCloseBranchesDialog = () => {
    setIsBranchesDialogOpen(false)
    setBranchesArea(null)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Areas</h1>
          <p className="text-muted-foreground">
            Manage and view all area information.
          </p>
        </div>
        <Button onClick={() => setIsFormDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Area
        </Button>
      </div>

      <div className="space-y-4">
        <AreaFilters />
        <AreaTable
          areas={areas}
          isLoading={isLoading}
          error={error instanceof Error ? error.message : error}
          onEdit={handleEditArea}
          onViewBranches={handleViewBranches}
        />
      </div>

      <AreaFormDialog
        area={selectedArea}
        open={isFormDialogOpen}
        onOpenChange={handleCloseFormDialog}
      />

      <AreaBranchesDialog
        area={branchesArea}
        open={isBranchesDialogOpen}
        onOpenChange={handleCloseBranchesDialog}
      />
    </div>
  )
}
