'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import type { Area } from '../types'
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
import { useCreateArea, useUpdateArea } from '../hooks/use-areas'

interface AreaFormDialogProps {
  area?: Area | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AreaFormDialog({
  area,
  open,
  onOpenChange,
  onSuccess,
}: AreaFormDialogProps) {
  const isEdit = !!area
  const [formData, setFormData] = useState({
    code: area?.code || '',
    name: area?.name || '',
    companyId: area?.companyId || '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const createMutation = useCreateArea({
    onSuccess: () => {
      onOpenChange(false)
      onSuccess?.()
      resetForm()
    },
  })
  
  const updateMutation = useUpdateArea({
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
      companyId: '',
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
    
    if (!formData.companyId.trim()) {
      newErrors.companyId = 'Company is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (isEdit && area) {
      updateMutation.mutate({
        id: area.id,
        data: {
          name: formData.name,
          companyId: formData.companyId || undefined,
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
            {isEdit ? 'Edit Area' : 'Add New Area'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update area information below.'
              : 'Fill in the details to create a new area.'}
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
                placeholder="e.g., AREA001"
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
                placeholder="e.g., North Region"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="companyId">Company *</Label>
              <Input
                id="companyId"
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                disabled={isLoading}
                placeholder="e.g., Company UUID"
              />
              {errors.companyId && (
                <p className="text-sm text-destructive">{errors.companyId}</p>
              )}
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
                  {isEdit ? 'Update Area' : 'Add Area'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
