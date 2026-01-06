'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStatusStore } from '@/features/status/stores/status-store'
import { useDashboardSummary, useClientStatus, useUpdateStatus, useBulkUpdateStatus } from '@/features/status/hooks/use-status'
import { useClients } from '@/features/clients/hooks/use-clients'
import { PeriodSelector, DashboardSummary, StatusUpdateDialog, StatusBadge } from '@/features/status/components'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

const COMPANY_ID = 'PCNI'

export default function PCNIDashboardPage() {
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type')
  const isPNP = typeParam === 'pnp'

  const currentPeriod = useStatusStore((state) => state.currentPeriod)
  const setCurrentPeriod = useStatusStore((state) => state.setCurrentPeriod)
  const isUpdateDialogOpen = useStatusStore((state) => state.isUpdateDialogOpen)
  const openUpdateDialog = useStatusStore((state) => state.openUpdateDialog)
  const closeUpdateDialog = useStatusStore((state) => state.closeUpdateDialog)
  const isBulkUpdateMode = useStatusStore((state) => state.isBulkUpdateMode)
  const setBulkUpdateMode = useStatusStore((state) => state.setBulkUpdateMode)
  const selectedClientIds = useStatusStore((state) => state.selectedClientIds)
  const toggleClientSelection = useStatusStore((state) => state.toggleClientSelection)
  const clearClientSelection = useStatusStore((state) => state.clearClientSelection)
  const selectedClientStatus = useStatusStore((state) => state.selectedClientStatus)
  const setSelectedClientStatus = useStatusStore((state) => state.setSelectedClientStatus)

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  // Initialize period based on type (PNP = quarterly, Non-PNP = monthly)
  useEffect(() => {
    const currentDate = new Date()
    setCurrentPeriod({
      periodType: isPNP ? 'quarterly' : 'monthly',
      periodYear: currentDate.getFullYear(),
      periodMonth: isPNP ? null : currentDate.getMonth() + 1,
      periodQuarter: isPNP ? Math.ceil((currentDate.getMonth() + 1) / 3) : null,
    })
  }, [isPNP, setCurrentPeriod])

  // Fetch dashboard summary
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useDashboardSummary(
    COMPANY_ID,
    currentPeriod
  )

  // Fetch clients
  const { data: clientsData, isLoading: clientsLoading, error: clientsError } = useClients(
    1,
    50,
    { isActive: true }
  )

  // Fetch client status for selected client
  const { data: clientStatus } = useClientStatus(
    selectedClientId || '',
    currentPeriod
  )

  // Update status mutation
  const updateStatus = useUpdateStatus()

  // Bulk update mutation
  const bulkUpdateStatus = useBulkUpdateStatus()

  const handleUpdateStatus = (clientId: string) => {
    setSelectedClientId(clientId)
    setSelectedClientStatus(clientStatus || null)
    openUpdateDialog()
  }

  const handleBulkUpdate = () => {
    if (selectedClientIds.size === 0) return

    const updates = Array.from(selectedClientIds).map((clientId) => ({
      clientId,
      periodType: currentPeriod.periodType,
      periodYear: currentPeriod.periodYear,
      periodMonth: currentPeriod.periodMonth,
      periodQuarter: currentPeriod.periodQuarter,
      statusId: 'TO_FOLLOW', // Default bulk update status
      reasonId: null,
      remarks: null,
      hasPayment: false,
    }))

    bulkUpdateStatus.mutate(
      { updates },
      {
        onSuccess: () => {
          clearClientSelection()
          setBulkUpdateMode(false)
        },
      }
    )
  }

  const handleToggleBulkMode = () => {
    setBulkUpdateMode(!isBulkUpdateMode)
    clearClientSelection()
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">PCNI Dashboard</h1>
        <p className="text-muted-foreground">
          Track and manage client status for PCNI company.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Sidebar - Period Selector */}
        <div className="lg:col-span-1">
          <PeriodSelector
            periodType={isPNP ? 'quarterly' : 'monthly'}
            value={currentPeriod}
            onChange={setCurrentPeriod}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Dashboard Summary */}
          <DashboardSummary
            summary={summary || {
              totalClients: 0,
              statusCounts: {},
              paymentCount: 0,
              terminalCount: 0,
              byPensionType: {},
            }}
            loading={summaryLoading}
          />

          {/* Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Client List</h3>
                  {isBulkUpdateMode && (
                    <span className="text-sm text-muted-foreground">
                      {selectedClientIds.size} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isBulkUpdateMode && selectedClientIds.size > 0 && (
                    <Button
                      onClick={handleBulkUpdate}
                      disabled={bulkUpdateStatus.isPending}
                    >
                      {bulkUpdateStatus.isPending ? 'Updating...' : 'Bulk Update'}
                    </Button>
                  )}
                  <Button
                    variant={isBulkUpdateMode ? 'default' : 'outline'}
                    onClick={handleToggleBulkMode}
                  >
                    {isBulkUpdateMode ? 'Exit Bulk Mode' : 'Bulk Update Mode'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client List */}
          <Card>
            <CardContent className="p-0">
              {clientsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner className="size-8" />
                </div>
              ) : clientsError ? (
                <div className="py-12 text-center text-destructive">
                  {clientsError instanceof Error ? clientsError.message : clientsError}
                </div>
              ) : !clientsData?.data || clientsData.data.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No clients found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {isBulkUpdateMode && (
                          <th className="w-10 px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={
                                clientsData.data.length > 0 &&
                                clientsData.data.every((client) =>
                                  selectedClientIds.has(client.id)
                                )
                              }
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                if (e.target.checked) {
                                  clientsData.data.forEach((client) =>
                                    toggleClientSelection(client.id)
                                  )
                                } else {
                                  clearClientSelection()
                                }
                              }}
                              className="h-4 w-4"
                            />
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Client Code
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Pension #
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Contact
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientsData.data.map((client) => (
                        <tr
                          key={client.id}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          {isBulkUpdateMode && (
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedClientIds.has(client.id)}
                                onChange={() => toggleClientSelection(client.id)}
                                className="h-4 w-4"
                              />
                            </td>
                          )}
                          <td className="px-4 py-3 font-medium">
                            {client.clientCode}
                          </td>
                          <td className="px-4 py-3">{client.fullName}</td>
                          <td className="px-4 py-3 text-sm">
                            {client.pensionNumber || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {client.contactNumber || 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status="PENDING" size="sm" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateStatus(client.id)}
                            >
                              Update Status
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Update Dialog */}
      {selectedClientId && (
        <StatusUpdateDialog
          open={isUpdateDialogOpen}
          onClose={closeUpdateDialog}
          clientId={selectedClientId}
          currentStatus={selectedClientStatus || undefined}
          companyId={COMPANY_ID}
          periodType={isPNP ? 'quarterly' : 'monthly'}
        />
      )}
    </div>
  )
}
