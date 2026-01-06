/**
 * Dashboard summary queries for Phase 6 Reports & Exports
 */

import { db } from '@/server/db'
import {
  clientPeriodStatus,
  clients,
  statusTypes,
  pensionTypes,
  branches,
  areas,
  areaBranches,
  products,
} from '@/server/db/schema'
import { eq, and, desc, sql, inArray, isNull, gte } from 'drizzle-orm'
import { logger } from '@/lib/logger'

// Type definitions
export interface StatusSummary {
  totalClients: number
  statusCounts: Record<string, number>
  statusPercentages: Record<string, number>
  paymentCount: number
  terminalCount: number
}

export interface PensionTypeSummary {
  pensionType: string
  totalClients: number
  statusCounts: Record<string, number>
}

export interface BranchPerformanceSummary {
  branchId: string
  branchName: string
  branchCode: string
  areaName: string
  totalClients: number
  completedCount: number
  inProgressCount: number
  pendingCount: number
  completionRate: number
}

export interface StatusTrend {
  date: string
  status: string
  count: number
}

export interface DashboardQueryParams {
  companyId?: string
  branchIds?: string[]
  periodYear: number
  periodMonth?: number
  periodQuarter?: number
}

/**
 * Get status summary with counts and percentages
 */
export async function getStatusSummary(params: DashboardQueryParams): Promise<StatusSummary> {
  try {
    const conditions = [
      eq(clientPeriodStatus.periodYear, params.periodYear),
      isNull(clients.deletedAt),
    ]

    if (params.periodMonth !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodMonth, params.periodMonth))
    }

    if (params.periodQuarter !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodQuarter, params.periodQuarter))
    }

    if (params.companyId) {
      conditions.push(eq(products.companyId, params.companyId))
    }

    if (params.branchIds && params.branchIds.length > 0) {
      conditions.push(inArray(clients.branchId, params.branchIds))
    }

    // Get total clients
    const totalClientsResult = await db
      .select({ count: sql<number>`count(distinct ${clients.id})` })
      .from(clients)
      .innerJoin(products, eq(clients.productId, products.id))
      .where(
        and(
          params.companyId ? eq(products.companyId, params.companyId) : undefined,
          isNull(clients.deletedAt),
          params.branchIds && params.branchIds.length > 0
            ? inArray(clients.branchId, params.branchIds)
            : undefined
        )
      )

    const totalClients = totalClientsResult[0]?.count ?? 0

    // Get status counts
    const statusCountsResult = await db
      .select({
        statusTypeName: statusTypes.name,
        count: sql<number>`count(${clientPeriodStatus.id})`,
      })
      .from(clientPeriodStatus)
      .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
      .innerJoin(products, eq(clients.productId, products.id))
      .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
      .where(and(...conditions))
      .groupBy(statusTypes.name)

    // Build status counts map
    const statusCounts: Record<string, number> = {}
    statusCountsResult.forEach((item) => {
      if (item.statusTypeName) {
        statusCounts[item.statusTypeName] = item.count
      }
    })

    // Calculate percentages
    const statusPercentages: Record<string, number> = {}
    Object.entries(statusCounts).forEach(([status, count]) => {
      statusPercentages[status] = totalClients > 0 ? (count / totalClients) * 100 : 0
    })

    // Get payment count
    const paymentCountResult = await db
      .select({ count: sql<number>`count(${clientPeriodStatus.id})` })
      .from(clientPeriodStatus)
      .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
      .innerJoin(products, eq(clients.productId, products.id))
      .where(and(...conditions, eq(clientPeriodStatus.hasPayment, true)))

    const paymentCount = paymentCountResult[0]?.count ?? 0

    // Get terminal count
    const terminalCountResult = await db
      .select({ count: sql<number>`count(${clientPeriodStatus.id})` })
      .from(clientPeriodStatus)
      .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
      .innerJoin(products, eq(clients.productId, products.id))
      .where(and(...conditions, eq(clientPeriodStatus.isTerminal, true)))

    const terminalCount = terminalCountResult[0]?.count ?? 0

    logger.info('Retrieved status summary', {
      action: 'get_status_summary',
      params,
      totalClients,
    })

    return {
      totalClients,
      statusCounts,
      statusPercentages,
      paymentCount,
      terminalCount,
    }
  } catch (error) {
    logger.error('Failed to get status summary', error as Error, {
      action: 'get_status_summary',
      params,
    })
    throw error
  }
}

/**
 * Get pension type breakdown with nested status counts
 */
export async function getPensionTypeSummary(params: DashboardQueryParams): Promise<PensionTypeSummary[]> {
  try {
    const conditions = [
      eq(clientPeriodStatus.periodYear, params.periodYear),
      isNull(clients.deletedAt),
    ]

    if (params.periodMonth !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodMonth, params.periodMonth))
    }

    if (params.periodQuarter !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodQuarter, params.periodQuarter))
    }

    if (params.companyId) {
      conditions.push(eq(products.companyId, params.companyId))
    }

    if (params.branchIds && params.branchIds.length > 0) {
      conditions.push(inArray(clients.branchId, params.branchIds))
    }

    // Get clients grouped by pension type and status
    const result = await db
      .select({
        pensionTypeName: pensionTypes.name,
        statusTypeName: statusTypes.name,
        count: sql<number>`count(${clientPeriodStatus.id})`,
      })
      .from(clientPeriodStatus)
      .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
      .innerJoin(products, eq(clients.productId, products.id))
      .innerJoin(pensionTypes, eq(clients.pensionTypeId, pensionTypes.id))
      .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
      .where(and(...conditions))
      .groupBy(pensionTypes.name, statusTypes.name)

    // Group by pension type
    const pensionTypeMap = new Map<string, PensionTypeSummary>()
    result.forEach((item) => {
      const pensionType = item.pensionTypeName || 'Unknown'
      
      if (!pensionTypeMap.has(pensionType)) {
        pensionTypeMap.set(pensionType, {
          pensionType,
          totalClients: 0,
          statusCounts: {},
        })
      }

      const summary = pensionTypeMap.get(pensionType)!
      if (item.statusTypeName) {
        summary.statusCounts[item.statusTypeName] = item.count
      }
      summary.totalClients += item.count
    })

    const summaries = Array.from(pensionTypeMap.values())

    logger.info('Retrieved pension type summary', {
      action: 'get_pension_type_summary',
      params,
      count: summaries.length,
    })

    return summaries
  } catch (error) {
    logger.error('Failed to get pension type summary', error as Error, {
      action: 'get_pension_type_summary',
      params,
    })
    throw error
  }
}

/**
 * Get branch performance metrics with completion rates
 */
export async function getBranchPerformanceSummary(
  params: DashboardQueryParams
): Promise<BranchPerformanceSummary[]> {
  try {
    const conditions = [
      eq(clientPeriodStatus.periodYear, params.periodYear),
      isNull(clients.deletedAt),
    ]

    if (params.periodMonth !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodMonth, params.periodMonth))
    }

    if (params.periodQuarter !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodQuarter, params.periodQuarter))
    }

    if (params.companyId) {
      conditions.push(eq(products.companyId, params.companyId))
    }

    if (params.branchIds && params.branchIds.length > 0) {
      conditions.push(inArray(clients.branchId, params.branchIds))
    }

    // Get branch performance data
    const result = await db
      .select({
        branchId: branches.id,
        branchName: branches.name,
        branchCode: branches.code,
        areaName: areas.name,
        statusTypeName: statusTypes.name,
        count: sql<number>`count(${clientPeriodStatus.id})`,
      })
      .from(clientPeriodStatus)
      .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
      .innerJoin(branches, eq(clients.branchId, branches.id))
      .innerJoin(areaBranches, eq(branches.id, areaBranches.branchId))
      .innerJoin(areas, eq(areaBranches.areaId, areas.id))
      .innerJoin(products, eq(clients.productId, products.id))
      .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
      .where(and(...conditions))
      .groupBy(branches.id, branches.name, branches.code, areas.name, statusTypes.name)

    // Group by branch
    const branchMap = new Map<string, BranchPerformanceSummary>()
    result.forEach((item) => {
      if (!branchMap.has(item.branchId)) {
        branchMap.set(item.branchId, {
          branchId: item.branchId,
          branchName: item.branchName,
          branchCode: item.branchCode,
          areaName: item.areaName || '',
          totalClients: 0,
          completedCount: 0,
          inProgressCount: 0,
          pendingCount: 0,
          completionRate: 0,
        })
      }

      const summary = branchMap.get(item.branchId)!
      summary.totalClients += item.count

      // Categorize by status
      const status = item.statusTypeName || 'PENDING'
      if (status === 'DONE') {
        summary.completedCount += item.count
      } else if (['TO_FOLLOW', 'CALLED', 'VISITED', 'UPDATED'].includes(status)) {
        summary.inProgressCount += item.count
      } else {
        summary.pendingCount += item.count
      }
    })

    // Calculate completion rates
    const summaries = Array.from(branchMap.values()).map((summary) => ({
      ...summary,
      completionRate: summary.totalClients > 0 
        ? (summary.completedCount / summary.totalClients) * 100 
        : 0,
    }))

    logger.info('Retrieved branch performance summary', {
      action: 'get_branch_performance_summary',
      params,
      count: summaries.length,
    })

    return summaries
  } catch (error) {
    logger.error('Failed to get branch performance summary', error as Error, {
      action: 'get_branch_performance_summary',
      params,
    })
    throw error
  }
}

/**
 * Get status trends over time
 */
export async function getStatusTrends(
  params: DashboardQueryParams & { days?: number }
): Promise<StatusTrend[]> {
  try {
    const days = params.days || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const conditions = [
      eq(clientPeriodStatus.periodYear, params.periodYear),
      isNull(clients.deletedAt),
      gte(clientPeriodStatus.updatedAt, startDate),
    ]

    if (params.periodMonth !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodMonth, params.periodMonth))
    }

    if (params.periodQuarter !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodQuarter, params.periodQuarter))
    }

    if (params.companyId) {
      conditions.push(eq(products.companyId, params.companyId))
    }

    if (params.branchIds && params.branchIds.length > 0) {
      conditions.push(inArray(clients.branchId, params.branchIds))
    }

    // Get status trends grouped by date and status
    const result = await db
      .select({
        date: sql<string>`date(${clientPeriodStatus.updatedAt})`,
        statusTypeName: statusTypes.name,
        count: sql<number>`count(${clientPeriodStatus.id})`,
      })
      .from(clientPeriodStatus)
      .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
      .innerJoin(products, eq(clients.productId, products.id))
      .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
      .where(and(...conditions))
      .groupBy(sql`date(${clientPeriodStatus.updatedAt})`, statusTypes.name)
      .orderBy(sql`date(${clientPeriodStatus.updatedAt})`)

    const trends: StatusTrend[] = result.map((item) => ({
      date: item.date,
      status: item.statusTypeName || 'PENDING',
      count: item.count,
    }))

    logger.info('Retrieved status trends', {
      action: 'get_status_trends',
      params,
      count: trends.length,
    })

    return trends
  } catch (error) {
    logger.error('Failed to get status trends', error as Error, {
      action: 'get_status_trends',
      params,
    })
    throw error
  }
}
