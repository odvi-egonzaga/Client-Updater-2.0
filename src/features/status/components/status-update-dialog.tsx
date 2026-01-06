'use client'

import type { ClientPeriodStatus, PeriodType } from '../types'
import { StatusUpdateForm } from './status-update-form'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface StatusUpdateDialogProps {
  open: boolean
  onClose: () => void
  clientId: string
  currentStatus?: ClientPeriodStatus
  companyId: string
  periodType: PeriodType
}

export function StatusUpdateDialog({
  open,
  onClose,
  clientId,
  currentStatus,
  companyId,
  periodType,
}: StatusUpdateDialogProps) {
  const handleSuccess = () => {
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Update Client Status</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <StatusUpdateForm
            clientId={clientId}
            currentStatus={currentStatus}
            companyId={companyId}
            periodType={periodType}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
