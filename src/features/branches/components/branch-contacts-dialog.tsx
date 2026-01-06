'use client'

import { useState } from 'react'
import { Phone, Mail, MapPin, Plus, Trash2, Star, Loader2 } from 'lucide-react'
import type { Branch, BranchContact } from '../types'
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
import { Select } from '@/components/ui/select'
import {
  useBranchContacts,
  useAddBranchContact,
  useUpdateBranchContact,
  useDeleteBranchContact,
  useSetPrimaryContact,
} from '../hooks/use-branches'

interface BranchContactsDialogProps {
  branch: Branch | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BranchContactsDialog({
  branch,
  open,
  onOpenChange,
}: BranchContactsDialogProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    type: 'phone',
    label: '',
    value: '',
    isPrimary: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const { data: contacts, isLoading } = useBranchContacts(branch?.id || '', {
    enabled: !!branch?.id && open,
  })
  
  const addContactMutation = useAddBranchContact({
    onSuccess: () => {
      setShowAddForm(false)
      resetForm()
    },
  })
  
  const updateContactMutation = useUpdateBranchContact()
  
  const deleteContactMutation = useDeleteBranchContact()
  
  const setPrimaryContactMutation = useSetPrimaryContact()

  const resetForm = () => {
    setFormData({
      type: 'phone',
      label: '',
      value: '',
      isPrimary: false,
    })
    setErrors({})
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.value.trim()) {
      newErrors.value = 'Contact value is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !branch) {
      return
    }

    addContactMutation.mutate({
      branchId: branch.id,
      data: formData,
    })
  }

  const handleSetPrimary = (contactId: string) => {
    if (!branch) return
    
    setPrimaryContactMutation.mutate({
      branchId: branch.id,
      contactId,
    })
  }

  const handleDeleteContact = (contactId: string) => {
    if (!branch) return
    
    if (confirm('Are you sure you want to delete this contact?')) {
      deleteContactMutation.mutate({
        branchId: branch.id,
        contactId,
      })
    }
  }

  const getContactIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'phone':
        return <Phone className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'address':
        return <MapPin className="h-4 w-4" />
      default:
        return <Phone className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Branch Contacts</DialogTitle>
          <DialogDescription>
            Manage contact information for {branch?.name}
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
                <form onSubmit={handleAddContact} className="space-y-4 rounded-lg border p-4">
                  <div className="grid gap-2">
                    <Label htmlFor="contact-type">Type</Label>
                    <Select
                      id="contact-type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="phone">Phone</option>
                      <option value="email">Email</option>
                      <option value="address">Address</option>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="contact-label">Label (Optional)</Label>
                    <Input
                      id="contact-label"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="e.g., Main, Billing, Support"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="contact-value">Value *</Label>
                    <Input
                      id="contact-value"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="e.g., +1-234-567-8900"
                    />
                    {errors.value && (
                      <p className="text-sm text-destructive">{errors.value}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="contact-primary"
                      checked={formData.isPrimary}
                      onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="contact-primary" className="cursor-pointer">
                      Set as primary contact
                    </Label>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false)
                        resetForm()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addContactMutation.isPending}>
                      {addContactMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Contact
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
              
              {!showAddForm && (
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              )}
              
              {contacts && contacts.length > 0 && (
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-start justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 text-muted-foreground">
                          {getContactIcon(contact.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{contact.value}</p>
                            {contact.isPrimary && (
                              <Star className="h-4 w-4 fill-primary text-primary" />
                            )}
                          </div>
                          {contact.label && (
                            <p className="text-sm text-muted-foreground">{contact.label}</p>
                          )}
                          <p className="text-xs text-muted-foreground capitalize">
                            {contact.type}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!contact.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimary(contact.id)}
                            title="Set as primary"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                          title="Delete contact"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {contacts && contacts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No contacts found. Add your first contact above.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
