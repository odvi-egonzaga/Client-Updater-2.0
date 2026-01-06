'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import type { Branch } from '../types'
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
import { Textarea } from '@/components/ui/textarea'
import { useCreateBranch, useUpdateBranch } from '../hooks/use-branches'

interface BranchFormDialogProps {
  branch?: Branch | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function BranchFormDialog({
  branch,
  open,
  onOpenChange,
  onSuccess,
}: BranchFormDialogProps) {
  const isEdit = !!branch
  const [formData, setFormData] = useState({
    code: branch?.code || '',
    name: branch?.name || '',
    location: branch?.location || '',
    category: branch?.category || '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const createMutation = useCreateBranch({
    onSuccess: () => {
      onOpenChange(false)
      onSuccess?.()
      resetForm()
    },
  })
  
  const updateMutation = useUpdateBranch({
    onSuccess: () => {
      onOpenChange(false)
      onSuccess?.()
      resetForm()
    },
  })

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      location: '',
      category: '',
    })
    setErrors({})
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.code.trim()) {
      newErrors.code = 'Code is required'
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (isEdit && branch) {
      updateMutation.mutate({
        id: branch.id,
        data: {
          name: formData.name,
          location: formData.location || undefined,
          category: formData.category || undefined,
        },
      })
    } else {
      createMutation.mutate(formData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Branch' : 'Add New Branch'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the branch information below.'
              : 'Fill in the details to create a new branch.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                disabled={isEdit || isLoading}
                placeholder="e.g., BR001"
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isLoading}
                placeholder="e.g., Main Branch"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Textarea
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={isLoading}
                placeholder="e.g., 123 Main St, City, State"
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={isLoading}
                placeholder="e.g., Retail, Corporate"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {isEdit ? 'Update Branch' : 'Add Branch'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
