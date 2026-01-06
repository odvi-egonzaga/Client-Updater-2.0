'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { ConfigSetting } from '../types'
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
import { useSetConfigSetting } from '../hooks/use-config'

interface ConfigSettingFormDialogProps {
  setting?: ConfigSetting | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ConfigSettingFormDialog({
  setting,
  open,
  onOpenChange,
  onSuccess,
}: ConfigSettingFormDialogProps) {
  const isEdit = !!setting
  const [formData, setFormData] = useState({
    value: setting?.value || '',
    valueType: setting?.valueType || 'string',
    description: setting?.description || '',
    isPublic: setting?.isPublic || false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const setSettingMutation = useSetConfigSetting({
    onSuccess: () => {
      onOpenChange(false)
      onSuccess?.()
      resetForm()
    },
  })

  const resetForm = () => {
    setFormData({
      value: '',
      valueType: 'string',
      description: '',
      isPublic: false,
    })
    setErrors({})
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.value.trim()) {
      newErrors.value = 'Value is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSettingMutation.mutate({
      key: setting?.key || '',
      data: {
        value: formData.value,
        valueType: formData.valueType,
        description: formData.description || undefined,
        isPublic: formData.isPublic,
      },
    })
  }

  const isLoading = setSettingMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Config Setting' : 'Edit Config Setting'}
          </DialogTitle>
          <DialogDescription>
            Update configuration setting value below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="valueType">Value Type</Label>
              <Select
                id="valueType"
                value={formData.valueType}
                onChange={(e) => setFormData({ ...formData, valueType: e.target.value as any })}
                disabled={isLoading}
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="json">JSON</option>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="value">Value *</Label>
              {formData.valueType === 'boolean' ? (
                <Select
                  id="value"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  disabled={isLoading}
                >
                  <option value="">Select a value</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </Select>
              ) : formData.valueType === 'json' ? (
                <Textarea
                  id="value"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  disabled={isLoading}
                  placeholder={`e.g., {"key": "value"}`}
                  rows={5}
                />
              ) : (
                <Input
                  id="value"
                  type={formData.valueType === 'number' ? 'number' : 'text'}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  disabled={isLoading}
                  placeholder="e.g., Setting value"
                />
              )}
              {errors.value && (
                <p className="text-sm text-destructive">{errors.value}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isLoading}
                placeholder="Description of this setting"
                rows={3}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                disabled={isLoading}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isPublic" className="cursor-pointer">
                Make this setting public (accessible to all users)
              </Label>
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
                'Update Setting'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
