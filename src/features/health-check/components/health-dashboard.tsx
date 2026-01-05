'use client'

import { SERVICES } from '@/features/health-check/config'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CheckCircle, XCircle, AlertCircle, Clock, Shield, Play, RefreshCw, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { HealthStatus } from '@/features/health-check/types'
import { useHealthStore } from '../stores/health-store'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'

const statusIcons: Record<HealthStatus, React.ReactNode> = {
  healthy: <CheckCircle className="h-5 w-5 text-green-500" />,
  unhealthy: <XCircle className="h-5 w-5 text-red-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />,
  pending: <Clock className="h-5 w-5 text-yellow-500" />,
  unconfigured: <Shield className="h-5 w-5 text-gray-400" />,
}

const statusColors: Record<HealthStatus, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-200',
  unhealthy: 'bg-red-100 text-red-800 border-red-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  unconfigured: 'bg-gray-100 text-gray-800 border-gray-200',
}

interface IndividualCheckResult {
  name: string
  status: HealthStatus
  responseTimeMs?: number
  error?: string
  httpStatus?: number
  timestamp?: string
  data?: any
}

export function HealthDashboard() {
  const [individualChecks, setIndividualChecks] = useState<Record<string, IndividualCheckResult>>({})
  const [loadingChecks, setLoadingChecks] = useState<Set<string>>(new Set())
  const healthStore = useHealthStore()
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  const totalHealthChecks = SERVICES.reduce((total, service) => total + service.checks.length, 0)

  const runIndividualCheck = async (serviceName: string, checkName: string, endpoint: string) => {
    const checkKey = `${serviceName}-${checkName}`
    setLoadingChecks((prev) => new Set(prev).add(checkKey))

    try {
      let result: { status?: string; responseTimeMs?: number; error?: string; data?: any }
      const start = performance.now()

      if (endpoint.startsWith('client:')) {
        // Handle client-side checks
        await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate async work

        if (endpoint === 'client:zustand') {
          healthStore.increment()
          const currentCount = useHealthStore.getState().counter
          result = {
            status: 'healthy',
            responseTimeMs: Math.round(performance.now() - start),
            data: { 
              message: 'Zustand store updated successfully',
              counter: currentCount 
            }
          }
        } else if (endpoint === 'client:query') {
           // Simulate a query check
           const queryState = queryClient.getQueryCache().getAll()
           result = {
             status: 'healthy',
             responseTimeMs: Math.round(performance.now() - start),
             data: {
               message: 'Query Client is active',
               queryCount: queryState.length,
               isFetching: queryClient.isFetching()
             }
           }
        } else {
          throw new Error(`Unknown client endpoint: ${endpoint}`)
        }
      } else {
        // Get auth token if available
        const token = await getToken()
        
        // Handle server-side checks
        const response = await fetch(`/api/health${endpoint}`, {
          method: ['/database/write', '/database/delete', '/storage/upload', '/storage/delete'].includes(endpoint) ? 'POST' : 'GET',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          ...(endpoint === '/database/delete' || endpoint === '/storage/delete' ? { method: 'DELETE' } : {})
        })
        // Check content type to ensure JSON
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
           const text = await response.text()
           throw new Error(`Invalid response from server: ${text.substring(0, 100)}...`)
        }
        result = await response.json()
      }

      setIndividualChecks((prev) => ({
        ...prev,
        [checkKey]: {
          name: checkName,
          status: (result.status ?? ('healthy')) as HealthStatus,
          responseTimeMs: result.responseTimeMs,
          error: result.error,
          httpStatus: endpoint.startsWith('client:') ? 200 : undefined,
          timestamp: new Date().toISOString(),
          data: result.data,
        },
      }))
    } catch (err) {
      setIndividualChecks((prev) => ({
        ...prev,
        [checkKey]: {
          name: checkName,
          status: 'error',
          error: err instanceof Error ? err.message : 'Check failed',
          timestamp: new Date().toISOString(),
          // Include responseTimeMs even on error for better UX
           responseTimeMs: 0,
        },
      }))
    } finally {
      setLoadingChecks((prev) => {
        const next = new Set(prev)
        next.delete(checkKey)
        return next
      })
    }
  }

  const runServiceChecks = async (serviceName: string) => {
    const service = SERVICES.find((s) => s.name === serviceName)
    if (!service) return

    for (const check of service.checks) {
      await runIndividualCheck(serviceName, check.name, check.endpoint)
    }
  }

  const runAllChecks = async () => {
    // Run all checks in parallel
    const promises = SERVICES.flatMap((service) =>
      service.checks.map((check) => runIndividualCheck(service.name, check.name, check.endpoint))
    )
    await Promise.all(promises)
  }

  // Calculate derived status from individual checks
  const getServiceStatus = (serviceName: string): HealthStatus => {
    const service = SERVICES.find((s) => s.name === serviceName)
    if (!service) return 'pending'

    const checks = service.checks
      .map((check) => {
        const checkKey = `${serviceName}-${check.name}`
        return individualChecks[checkKey]
      })
      .filter((c): c is IndividualCheckResult => !!c)

    if (checks.length === 0) return 'pending'

    if (checks.some((c) => c.status === 'error' || (c.httpStatus && c.httpStatus >= 400))) return 'error'
    if (checks.some((c) => c.status === 'unconfigured')) return 'unconfigured'
    if (checks.length < service.checks.length) return 'pending'
    
    return 'healthy'
  }

  const overallStatus = (() => {
    const statuses = SERVICES.map((s) => getServiceStatus(s.name))
    if (statuses.some((s) => s === 'error')) return 'error'
    if (statuses.some((s) => s === 'pending')) return 'pending'
    if (statuses.some((s) => s === 'unconfigured')) return 'unconfigured'
    return 'healthy'
  })()

  const lastUpdated = Object.values(individualChecks)
    .map((c) => c.timestamp)
    .filter(Boolean)
    .sort()
    .pop()

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card className="p-6">
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="w-full group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-3xl">{statusIcons[overallStatus]}</div>
                <div className="text-left">
                  <h2 className="text-xl font-semibold">Overall System Status</h2>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge className={statusColors[overallStatus]} variant="outline">
                  {overallStatus.toUpperCase()}
                </Badge>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-4 flex gap-2">
              <Button onClick={runAllChecks} size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Run All Checks ({totalHealthChecks})
              </Button>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground self-center ml-auto">
                  Last updated: {new Date(lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Service Cards */}
      <div className="space-y-4">
        {SERVICES.map((service) => {
          const serviceStatus = getServiceStatus(service.name)
          const isServiceLoading = Array.from(loadingChecks).some((key) => key.startsWith(`${service.name}-`))

          return (
            <Card key={service.name} className="p-4">
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="w-full group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-xl">{statusIcons[serviceStatus]}</div>
                      <div className="text-left">
                        <h3 className="font-semibold">{service.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {service.checks.length} check{(service.checks.length as number) !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 ml-2"
                        disabled={isServiceLoading}
                        onClick={(e) => {
                          e.stopPropagation()
                          runServiceChecks(service.name)
                        }}
                      >
                        {isServiceLoading ? (
                          <LoadingSpinner className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        Run Checks
                      </Button>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={statusColors[serviceStatus]} variant="outline">
                        {serviceStatus.toUpperCase()}
                      </Badge>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="space-y-3">
                    {service.checks.map((check) => {
                      const checkKey = `${service.name}-${check.name}`
                      const individualResult = individualChecks[checkKey]
                      const isLoadingCheck = loadingChecks.has(checkKey)
                      const checkStatus: HealthStatus = individualResult?.status ?? 'pending'

                      return (
                        <div key={check.name} className="border rounded-lg p-3 bg-muted/30">
                          <Collapsible defaultOpen={!!individualResult}>
                            <div className="flex items-center justify-between mb-2">
                              <CollapsibleTrigger className="group flex items-center gap-2 hover:opacity-80 transition-opacity">
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                <div className="flex items-center gap-2 text-left">
                                  <div className="text-lg">{statusIcons[checkStatus]}</div>
                                  <div>
                                    <p className="font-medium text-sm">{check.name}</p>
                                    <p className="text-xs text-muted-foreground">{check.endpoint}</p>
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => runIndividualCheck(service.name, check.name, check.endpoint)}
                                disabled={isLoadingCheck}
                                className="gap-1"
                              >
                                {isLoadingCheck ? (
                                  <>
                                    <LoadingSpinner className="h-3 w-3" />
                                    Running...
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3" />
                                    Run Check
                                  </>
                                )}
                              </Button>
                            </div>

                            {/* Individual Check Result */}
                            <CollapsibleContent>
                              {individualResult && (
                                <div className="mt-2 p-3 bg-background rounded border">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      {statusIcons[individualResult.status]}
                                      <Badge className={statusColors[individualResult.status]} variant="outline">
                                        {individualResult.status.toUpperCase()}
                                      </Badge>
                                    </div>
                                    {individualResult.responseTimeMs && (
                                      <span className="text-xs text-muted-foreground">
                                        {individualResult.responseTimeMs}ms
                                      </span>
                                    )}
                                  </div>
                                  {individualResult.error && (
                                    <p className="text-sm text-red-600 mt-1">{individualResult.error}</p>
                                  )}
                                  {individualResult.httpStatus && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      HTTP Status: {individualResult.httpStatus}
                                    </p>
                                  )}
                                  {individualResult.timestamp && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Checked at: {new Date(individualResult.timestamp).toLocaleString()}
                                    </p>
                                  )}
                                  {individualResult.data && (
                                    <div className="mt-2">
                                      <pre className="p-2 rounded bg-muted text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                                        {JSON.stringify(individualResult.data, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
