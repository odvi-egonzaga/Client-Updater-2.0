'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import type { ConfigOption } from '../types'
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
import { Select } from '@/components/ui/select'
import { useCreateConfigOption, useUpdateConfigOption } from '../hooks/use-config'
import { useConfigCategories } from '../hooks/use-config'

interface ConfigOptionFormDialogProps {
  option?: ConfigOption | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ConfigOptionFormDialog({
  option,
  open,
  onOpenChange,
  onSuccess,
}: ConfigOptionFormDialogProps) {
  const isEdit = !!option
  const [formData, setFormData] = useState({
    categoryId: option?.categoryId || '',
    code: option?.code || '',
    label: option?.label || '',
    value: option?.value || '',
    isDefault: option?.isDefault || false,
    sortOrder: option?.sortOrder || 0,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const { data: categories } = useConfigCategories()
  
  const createMutation = useCreateConfigOption({
    onSuccess: () => {
      onOpenChange(false)
      onSuccess?.()
      resetForm()
    },
  })
  
  const updateMutation = useUpdateConfigOption({
    onSuccess: () => {
      onOpenChange(false)
      onSuccess?.()
      resetForm()
    },
  })

  const resetForm = () => {
    setFormData({
      categoryId: '',
      code: '',
      label: '',
      value: '',
      isDefault: false,
      sortOrder: 0,
    })
    setErrors({})
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.categoryId.trim()) {
      newErrors.categoryId = 'Category is required'
    }
    
    if (!formData.code.trim()) {
      newErrors.code = 'Code is required'
    }
    
    if (!formData.label.trim()) {
      newErrors.label = 'Label is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (isEdit && option) {
      updateMutation.mutate({
        id: option.id,
        data: {
          label: formData.label,
          value: formData.value || undefined,
          isDefault: formData.isDefault,
          sortOrder: formData.sortOrder,
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
            {isEdit ? 'Edit Config Option' : 'Add Config Option'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update configuration option below.'
              : 'Fill in the details to create a new configuration option.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="categoryId">Category *</Label>
              <Select
                id="categoryId"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                disabled={isLoading}
              >
                <option value="">Select a category</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              {errors.categoryId && (
                <p className="text-sm text-destructive">{errors.categoryId}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                disabled={isEdit || isLoading}
                placeholder="e.g., OPTION_001"
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                disabled={isLoading}
                placeholder="e.g., Option Label"
              />
              {errors.label && (
                <p className="text-sm text-destructive">{errors.label}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="value">Value</Label>
              <Textarea
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                disabled={isLoading}
                placeholder="e.g., Option value"
                rows={3}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                disabled={isLoading}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Set as default option
              </Label>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder.toString()}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                disabled={isLoading}
                placeholder="0"
                min="0"
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
                  {isEdit ? 'Update Option' : 'Add Option'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
