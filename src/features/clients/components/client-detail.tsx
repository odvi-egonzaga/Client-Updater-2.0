'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Phone, MapPin, Database } from 'lucide-react'
import type { ClientWithDetails } from '../types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface ClientDetailProps {
  client?: ClientWithDetails
  isLoading?: boolean
  error?: string | null
}

export function ClientDetail({ client, isLoading, error }: ClientDetailProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner className="size-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12">
        <p className="text-center text-destructive">{error}</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="py-12">
        <p className="text-center text-muted-foreground">Client not found</p>
      </div>
    )
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/clients">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 size-4" />
              Back to Clients
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{client.fullName}</h1>
            <Badge variant={client.isActive ? 'default' : 'secondary'}>
              {client.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Client Code: {client.clientCode}
          </p>
        </div>
      </div>

      {/* 4-Card Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Phone className="size-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Contact Number</p>
                <p className="text-sm text-muted-foreground">
                  {client.contactNumber || 'N/A'}
                </p>
              </div>
            </div>
            {client.contactNumberAlt && (
              <div className="flex items-start gap-3">
                <Phone className="size-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Alternate Contact</p>
                  <p className="text-sm text-muted-foreground">
                    {client.contactNumberAlt}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="size-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Birth Date</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(client.birthDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Classification Card */}
        <Card>
          <CardHeader>
            <CardTitle>Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium">Pension Type</p>
              <p className="text-sm text-muted-foreground">
                {client.pensionType?.name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Pensioner Type</p>
              <p className="text-sm text-muted-foreground">
                {client.pensionerType?.name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Product</p>
              <p className="text-sm text-muted-foreground">
                {client.product?.name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Account Type</p>
              <p className="text-sm text-muted-foreground">
                {client.accountType?.name || 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Branch & PAR Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Branch & PAR Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="size-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Branch</p>
                <p className="text-sm text-muted-foreground">
                  {client.branch?.name || 'N/A'}
                  {client.branch?.location && (
                    <span className="ml-2 text-xs">
                      ({client.branch.location})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">PAR Status</p>
              <p className="text-sm text-muted-foreground">
                {client.parStatus?.name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Loan Status</p>
              <p className="text-sm text-muted-foreground">
                {client.loanStatus || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Past Due Amount</p>
              <p className="text-sm text-muted-foreground">
                {client.pastDueAmount || 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Period Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Period Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.currentStatus ? (
              <>
                <div>
                  <p className="text-sm font-medium">Status Type</p>
                  <p className="text-sm text-muted-foreground">
                    {client.currentStatus.statusTypeId || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Reason</p>
                  <p className="text-sm text-muted-foreground">
                    {client.currentStatus.reasonId || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Has Payment</p>
                  <Badge variant={client.currentStatus.hasPayment ? 'default' : 'secondary'}>
                    {client.currentStatus.hasPayment ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {client.currentStatus.remarks && (
                  <div>
                    <p className="text-sm font-medium">Remarks</p>
                    <p className="text-sm text-muted-foreground">
                      {client.currentStatus.remarks}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(client.currentStatus.updatedAt)}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No current period status</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sync Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5" />
            Sync Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Last Synced At</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(client.lastSyncedAt)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Sync Source</p>
              <Badge variant="outline">
                {client.syncSource || 'N/A'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
