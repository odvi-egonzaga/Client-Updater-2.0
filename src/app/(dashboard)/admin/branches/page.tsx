'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { BranchFilters } from '@/features/branches/components/branch-filters'
import { BranchTable } from '@/features/branches/components/branch-table'
import { BranchFormDialog } from '@/features/branches/components/branch-form-dialog'
import { BranchContactsDialog } from '@/features/branches/components/branch-contacts-dialog'
import { useBranches } from '@/features/branches/hooks/use-branches'
import { useBranchesStore } from '@/features/branches/stores/branches-store'
import type { Branch } from '@/features/branches/types'
import { Button } from '@/components/ui/button'

export default function BranchesPage() {
  const { isLoading, error } = useBranches()
  const branches = useBranchesStore((state) => state.branches)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [isContactsDialogOpen, setIsContactsDialogOpen] = useState(false)
  const [contactsBranch, setContactsBranch] = useState<Branch | null>(null)

  const handleEditBranch = (branch: Branch) => {
    setSelectedBranch(branch)
    setIsFormDialogOpen(true)
  }

  const handleViewContacts = (branch: Branch) => {
    setContactsBranch(branch)
    setIsContactsDialogOpen(true)
  }

  const handleCloseFormDialog = () => {
    setIsFormDialogOpen(false)
    setSelectedBranch(null)
  }

  const handleCloseContactsDialog = () => {
    setIsContactsDialogOpen(false)
    setContactsBranch(null)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Branches</h1>
          <p className="text-muted-foreground">
            Manage and view all branch information.
          </p>
        </div>
        <Button onClick={() => setIsFormDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Branch
        </Button>
      </div>

      <div className="space-y-4">
        <BranchFilters />
        <BranchTable
          branches={branches}
          isLoading={isLoading}
          error={error}
          onEdit={handleEditBranch}
          onViewContacts={handleViewContacts}
        />
      </div>

      <BranchFormDialog
        branch={selectedBranch}
        open={isFormDialogOpen}
        onOpenChange={handleCloseFormDialog}
      />

      <BranchContactsDialog
        branch={contactsBranch}
        open={isContactsDialogOpen}
        onOpenChange={handleCloseContactsDialog}
      />
    </div>
  )
}
