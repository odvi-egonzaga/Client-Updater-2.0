/**
 * Status queries for Phase 4 Status Tracking
 */

import { db } from "../index";
import {
  clientPeriodStatus,
  statusEvents,
  statusTypes,
  statusReasons,
  clients,
  companies,
  products,
} from "../schema";
import { eq, and, desc, sql, inArray, isNull } from "drizzle-orm";
import { logger } from "@/lib/logger";

// Type definitions
export interface StatusFilters {
  companyId?: string;
  statusTypeId?: string;
  reasonId?: string;
  periodType?: "monthly" | "quarterly";
  periodYear?: number;
  periodMonth?: number;
  periodQuarter?: number;
  hasPayment?: boolean;
  isTerminal?: boolean;
  branchIds?: string[];
}

export interface CreateClientPeriodStatusInput {
  clientId: string;
  periodType: "monthly" | "quarterly";
  periodYear: number;
  periodMonth?: number;
  periodQuarter?: number;
  statusTypeId?: string;
  reasonId?: string;
  remarks?: string;
  hasPayment?: boolean;
  isTerminal?: boolean;
  updatedBy?: string;
  updateCount?: number;
}

export interface UpdateClientPeriodStatusInput {
  statusTypeId?: string;
  reasonId?: string;
  remarks?: string;
  hasPayment?: boolean;
  updateCount?: number;
  isTerminal?: boolean;
  updatedBy?: string;
}

export interface CreateStatusEventInput {
  clientPeriodStatusId: string;
  statusTypeId?: string;
  reasonId?: string;
  remarks?: string;
  hasPayment?: boolean;
  createdBy: string;
}

export interface DashboardSummary {
  totalClients: number;
  statusCounts: Array<{
    statusTypeId: string;
    statusTypeName: string;
    count: number;
  }>;
  paymentCount: number;
  terminalCount: number;
}

/**
 * Get current status for a client in a specific period
 * @param db - Database instance
 * @param clientId - Client ID
 * @param periodType - Period type (monthly or quarterly)
 * @param periodYear - Period year
 * @param periodMonth - Period month (1-12 for monthly periods)
 * @param periodQuarter - Period quarter (1-4 for quarterly periods)
 * @returns Client period status or null if not found
 */
export async function getClientCurrentStatus(
  db: any,
  clientId: string,
  periodType: "monthly" | "quarterly",
  periodYear: number,
  periodMonth?: number,
  periodQuarter?: number,
) {
  try {
    const conditions = [
      eq(clientPeriodStatus.clientId, clientId),
      eq(clientPeriodStatus.periodType, periodType),
      eq(clientPeriodStatus.periodYear, periodYear),
    ];

    if (periodType === "monthly" && periodMonth !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodMonth, periodMonth));
    }

    if (periodType === "quarterly" && periodQuarter !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodQuarter, periodQuarter));
    }

    const result = await db
      .select({
        id: clientPeriodStatus.id,
        clientId: clientPeriodStatus.clientId,
        periodType: clientPeriodStatus.periodType,
        periodMonth: clientPeriodStatus.periodMonth,
        periodQuarter: clientPeriodStatus.periodQuarter,
        periodYear: clientPeriodStatus.periodYear,
        statusTypeId: clientPeriodStatus.statusTypeId,
        statusTypeName: statusTypes.name,
        reasonId: clientPeriodStatus.reasonId,
        reasonName: statusReasons.name,
        remarks: clientPeriodStatus.remarks,
        hasPayment: clientPeriodStatus.hasPayment,
        updateCount: clientPeriodStatus.updateCount,
        isTerminal: clientPeriodStatus.isTerminal,
        updatedBy: clientPeriodStatus.updatedBy,
        updatedAt: clientPeriodStatus.updatedAt,
        createdAt: clientPeriodStatus.createdAt,
      })
      .from(clientPeriodStatus)
      .leftJoin(
        statusTypes,
        eq(clientPeriodStatus.statusTypeId, statusTypes.id),
      )
      .leftJoin(
        statusReasons,
        eq(clientPeriodStatus.reasonId, statusReasons.id),
      )
      .where(and(...conditions))
      .limit(1);

    logger.info("Retrieved client current status", {
      action: "get_client_current_status",
      clientId,
      periodType,
      periodYear,
      periodMonth,
      periodQuarter,
    });

    return result[0] ?? null;
  } catch (error) {
    logger.error("Failed to get client current status", error as Error, {
      action: "get_client_current_status",
      clientId,
      periodType,
      periodYear,
      periodMonth,
      periodQuarter,
    });
    throw error;
  }
}

/**
 * Get status change history for a client
 * @param db - Database instance
 * @param clientId - Client ID
 * @param limit - Maximum number of events to return (default: 50)
 * @returns Array of status events
 */
export async function getClientStatusHistory(
  db: any,
  clientId: string,
  limit: number = 50,
) {
  try {
    const result = await db
      .select({
        id: statusEvents.id,
        clientPeriodStatusId: statusEvents.clientPeriodStatusId,
        statusTypeId: statusEvents.statusTypeId,
        statusTypeName: statusTypes.name,
        reasonId: statusEvents.reasonId,
        reasonName: statusReasons.name,
        remarks: statusEvents.remarks,
        hasPayment: statusEvents.hasPayment,
        eventSequence: statusEvents.eventSequence,
        createdBy: statusEvents.createdBy,
        createdAt: statusEvents.createdAt,
      })
      .from(statusEvents)
      .innerJoin(
        clientPeriodStatus,
        eq(statusEvents.clientPeriodStatusId, clientPeriodStatus.id),
      )
      .leftJoin(statusTypes, eq(statusEvents.statusTypeId, statusTypes.id))
      .leftJoin(statusReasons, eq(statusEvents.reasonId, statusReasons.id))
      .where(eq(clientPeriodStatus.clientId, clientId))
      .orderBy(desc(statusEvents.createdAt))
      .limit(limit);

    logger.info("Retrieved client status history", {
      action: "get_client_status_history",
      clientId,
      count: result.length,
      limit,
    });

    return result;
  } catch (error) {
    logger.error("Failed to get client status history", error as Error, {
      action: "get_client_status_history",
      clientId,
      limit,
    });
    throw error;
  }
}

/**
 * Get clients filtered by status
 * @param db - Database instance
 * @param filters - Status filters
 * @returns Array of client period statuses with client details
 */
export async function getClientsByStatus(db: any, filters: StatusFilters) {
  try {
    const conditions = [];

    // Build conditions based on filters
    if (filters.companyId) {
      conditions.push(eq(companies.id, filters.companyId));
    }

    if (filters.statusTypeId) {
      conditions.push(
        eq(clientPeriodStatus.statusTypeId, filters.statusTypeId),
      );
    }

    if (filters.reasonId) {
      conditions.push(eq(clientPeriodStatus.reasonId, filters.reasonId));
    }

    if (filters.periodType) {
      conditions.push(eq(clientPeriodStatus.periodType, filters.periodType));
    }

    if (filters.periodYear) {
      conditions.push(eq(clientPeriodStatus.periodYear, filters.periodYear));
    }

    if (filters.periodMonth) {
      conditions.push(eq(clientPeriodStatus.periodMonth, filters.periodMonth));
    }

    if (filters.periodQuarter) {
      conditions.push(
        eq(clientPeriodStatus.periodQuarter, filters.periodQuarter),
      );
    }

    if (filters.hasPayment !== undefined) {
      conditions.push(eq(clientPeriodStatus.hasPayment, filters.hasPayment));
    }

    if (filters.isTerminal !== undefined) {
      conditions.push(eq(clientPeriodStatus.isTerminal, filters.isTerminal));
    }

    // Always filter out deleted clients
    conditions.push(isNull(clients.deletedAt));

    let query = db
      .select({
        id: clientPeriodStatus.id,
        clientId: clientPeriodStatus.clientId,
        clientCode: clients.clientCode,
        fullName: clients.fullName,
        pensionNumber: clients.pensionNumber,
        branchId: clients.branchId,
        periodType: clientPeriodStatus.periodType,
        periodMonth: clientPeriodStatus.periodMonth,
        periodQuarter: clientPeriodStatus.periodQuarter,
        periodYear: clientPeriodStatus.periodYear,
        statusTypeId: clientPeriodStatus.statusTypeId,
        statusTypeName: statusTypes.name,
        reasonId: clientPeriodStatus.reasonId,
        reasonName: statusReasons.name,
        remarks: clientPeriodStatus.remarks,
        hasPayment: clientPeriodStatus.hasPayment,
        updateCount: clientPeriodStatus.updateCount,
        isTerminal: clientPeriodStatus.isTerminal,
        updatedAt: clientPeriodStatus.updatedAt,
      })
      .from(clientPeriodStatus)
      .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
      .leftJoin(
        statusTypes,
        eq(clientPeriodStatus.statusTypeId, statusTypes.id),
      )
      .leftJoin(
        statusReasons,
        eq(clientPeriodStatus.reasonId, statusReasons.id),
      )
      .leftJoin(products, eq(clients.productId, products.id))
      .leftJoin(companies, eq(products.companyId, companies.id));

    if (filters.branchIds && filters.branchIds.length > 0) {
      conditions.push(inArray(clients.branchId, filters.branchIds));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query.orderBy(desc(clientPeriodStatus.updatedAt));

    logger.info("Retrieved clients by status", {
      action: "get_clients_by_status",
      filters,
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to get clients by status", error as Error, {
      action: "get_clients_by_status",
      filters,
    });
    throw error;
  }
}

/**
 * Create new period status record
 * @param db - Database instance
 * @param data - Client period status data
 * @returns Created client period status
 */
export async function createClientPeriodStatus(
  db: any,
  data: CreateClientPeriodStatusInput,
) {
  try {
    const result = await db
      .insert(clientPeriodStatus)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info("Created client period status", {
      action: "create_client_period_status",
      clientId: data.clientId,
      periodType: data.periodType,
      periodYear: data.periodYear,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to create client period status", error as Error, {
      action: "create_client_period_status",
      clientId: data.clientId,
    });
    throw error;
  }
}

/**
 * Update existing status
 * @param db - Database instance
 * @param id - Client period status ID
 * @param data - Update data
 * @returns Updated client period status
 */
export async function updateClientPeriodStatus(
  db: any,
  id: string,
  data: UpdateClientPeriodStatusInput,
) {
  try {
    const result = await db
      .update(clientPeriodStatus)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(clientPeriodStatus.id, id))
      .returning();

    if (!result[0]) {
      return null;
    }

    logger.info("Updated client period status", {
      action: "update_client_period_status",
      id,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to update client period status", error as Error, {
      action: "update_client_period_status",
      id,
    });
    throw error;
  }
}

/**
 * Record status change to audit trail
 * @param db - Database instance
 * @param data - Status event data
 * @returns Created status event
 */
export async function recordStatusEvent(db: any, data: CreateStatusEventInput) {
  try {
    // Get the next event sequence for this period status
    const existingEvents = await db
      .select({ maxSequence: sql<number>`max(${statusEvents.eventSequence})` })
      .from(statusEvents)
      .where(eq(statusEvents.clientPeriodStatusId, data.clientPeriodStatusId));

    const nextSequence = (existingEvents[0]?.maxSequence ?? 0) + 1;

    const result = await db
      .insert(statusEvents)
      .values({
        ...data,
        eventSequence: nextSequence,
        createdAt: new Date(),
      })
      .returning();

    logger.info("Recorded status event", {
      action: "record_status_event",
      clientPeriodStatusId: data.clientPeriodStatusId,
      eventSequence: nextSequence,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to record status event", error as Error, {
      action: "record_status_event",
      clientPeriodStatusId: data.clientPeriodStatusId,
    });
    throw error;
  }
}

/**
 * Get dashboard summary counts
 * @param db - Database instance
 * @param companyId - Company ID
 * @param periodYear - Period year
 * @param periodMonth - Period month (for monthly periods)
 * @param periodQuarter - Period quarter (for quarterly periods)
 * @returns Dashboard summary with counts
 */
export async function getDashboardSummary(
  db: any,
  companyId: string,
  periodYear: number,
  periodMonth?: number,
  periodQuarter?: number,
): Promise<DashboardSummary> {
  try {
    const conditions = [
      eq(products.companyId, companyId),
      eq(clientPeriodStatus.periodYear, periodYear),
    ];

    if (periodMonth !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodMonth, periodMonth));
    }

    if (periodQuarter !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodQuarter, periodQuarter));
    }

    // Always filter out deleted clients
    conditions.push(isNull(clients.deletedAt));

    // Get total clients
    const totalClientsResult = await db
      .select({ count: sql<number>`count(distinct ${clients.id})` })
      .from(clients)
      .innerJoin(products, eq(clients.productId, products.id))
      .where(and(eq(products.companyId, companyId), isNull(clients.deletedAt)));

    // Get status counts
    const statusCountsResult = await db
      .select({
        statusTypeId: clientPeriodStatus.statusTypeId,
        statusTypeName: statusTypes.name,
        count: sql<number>`count(${clientPeriodStatus.id})`,
      })
      .from(clientPeriodStatus)
      .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
      .innerJoin(products, eq(clients.productId, products.id))
      .leftJoin(
        statusTypes,
        eq(clientPeriodStatus.statusTypeId, statusTypes.id),
      )
      .where(and(...conditions))
      .groupBy(clientPeriodStatus.statusTypeId, statusTypes.name);

    // Get payment count
    const paymentCountResult = await db
      .select({ count: sql<number>`count(${clientPeriodStatus.id})` })
      .from(clientPeriodStatus)
      .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
      .innerJoin(products, eq(clients.productId, products.id))
      .where(and(...conditions, eq(clientPeriodStatus.hasPayment, true)));

    // Get terminal count
    const terminalCountResult = await db
      .select({ count: sql<number>`count(${clientPeriodStatus.id})` })
      .from(clientPeriodStatus)
      .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
      .innerJoin(products, eq(clients.productId, products.id))
      .where(and(...conditions, eq(clientPeriodStatus.isTerminal, true)));

    const summary: DashboardSummary = {
      totalClients: totalClientsResult[0]?.count ?? 0,
      statusCounts: statusCountsResult,
      paymentCount: paymentCountResult[0]?.count ?? 0,
      terminalCount: terminalCountResult[0]?.count ?? 0,
    };

    logger.info("Retrieved dashboard summary", {
      action: "get_dashboard_summary",
      companyId,
      periodYear,
      periodMonth,
      periodQuarter,
    });

    return summary;
  } catch (error) {
    logger.error("Failed to get dashboard summary", error as Error, {
      action: "get_dashboard_summary",
      companyId,
      periodYear,
      periodMonth,
      periodQuarter,
    });
    throw error;
  }
}

/**
 * Get available years based on current date
 * @param currentDate - Current date (defaults to now)
 * @returns Array of available years
 */
export function getAvailableYears(currentDate: Date = new Date()): number[] {
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  if (currentMonth >= 9) {
    // September onwards
    return [currentYear - 1, currentYear, currentYear + 1];
  } else {
    return [currentYear - 2, currentYear - 1, currentYear];
  }
}
