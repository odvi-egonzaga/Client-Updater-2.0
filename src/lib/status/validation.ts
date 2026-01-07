/**
 * Status Workflow Validation Service
 * Handles validation logic for status transitions, reason selection, and terminal status logic
 */

import { db } from "@/server/db/index";
import {
  statusTypes,
  statusReasons,
  companies,
} from "@/server/db/schema/lookups";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

// Type definitions
export interface ValidationResult {
  isValid: boolean;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface StatusUpdateInput {
  clientPeriodStatusId: string;
  fromStatusId?: string;
  toStatusId: string;
  reasonId?: string;
  remarks?: string;
  companyId: string;
  updatedBy: string;
}

// Status workflow constants
const STATUS_WORKFLOW: Record<string, string[]> = {
  PENDING: ["TO_FOLLOW"],
  TO_FOLLOW: ["CALLED"],
  CALLED: ["VISITED", "UPDATED"],
  VISITED: ["UPDATED"],
  UPDATED: ["DONE"],
  DONE: [], // Terminal - cannot transition
};

// Terminal status codes
const TERMINAL_STATUSES = ["Deceased", "Fully-Paid"];

// FCASH company code
const FCASH_COMPANY_CODE = "FCASH";

/**
 * Validate status transition
 * @param fromStatus - Current status code
 * @param toStatus - Target status code
 * @param companyId - Company ID
 * @returns Validation result
 */
export async function validateStatusTransition(
  fromStatus: string,
  toStatus: string,
  companyId: string,
): Promise<ValidationResult> {
  try {
    // Get company to check if it's FCASH
    const company = await db
      .select({ code: companies.code })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    const isFCASH = company[0]?.code === FCASH_COMPANY_CODE;

    // Check if from status is terminal
    if (TERMINAL_STATUSES.includes(fromStatus)) {
      return {
        isValid: false,
        error: {
          code: "TERMINAL_STATUS",
          message: `Cannot transition from terminal status: ${fromStatus}`,
          details: { fromStatus, toStatus },
        },
      };
    }

    // Check if to status is terminal
    if (TERMINAL_STATUSES.includes(toStatus)) {
      return {
        isValid: false,
        error: {
          code: "TERMINAL_STATUS",
          message: `Cannot transition to terminal status: ${toStatus}`,
          details: { fromStatus, toStatus },
        },
      };
    }

    // Check if VISITED status is allowed (FCASH only)
    if (toStatus === "VISITED" && !isFCASH) {
      return {
        isValid: false,
        error: {
          code: "VISITED_NOT_ALLOWED",
          message: "VISITED status is only allowed for FCASH company",
          details: { fromStatus, toStatus, companyId },
        },
      };
    }

    // Check if transition is allowed in workflow
    const allowedTransitions = STATUS_WORKFLOW[fromStatus] || [];
    if (!allowedTransitions.includes(toStatus)) {
      return {
        isValid: false,
        error: {
          code: "INVALID_TRANSITION",
          message: `Invalid status transition from ${fromStatus} to ${toStatus}`,
          details: {
            fromStatus,
            toStatus,
            allowedTransitions,
          },
        },
      };
    }

    // Check if trying to go backward
    const fromSequence = Object.keys(STATUS_WORKFLOW).indexOf(fromStatus);
    const toSequence = Object.keys(STATUS_WORKFLOW).indexOf(toStatus);
    if (toSequence < fromSequence && toSequence !== -1) {
      return {
        isValid: false,
        error: {
          code: "BACKWARD_TRANSITION",
          message: "Cannot transition backward in status workflow",
          details: { fromStatus, toStatus },
        },
      };
    }

    logger.info("Status transition validated", {
      action: "validate_status_transition",
      fromStatus,
      toStatus,
      companyId,
      isValid: true,
    });

    return { isValid: true };
  } catch (error) {
    logger.error("Failed to validate status transition", error as Error, {
      action: "validate_status_transition",
      fromStatus,
      toStatus,
      companyId,
    });

    return {
      isValid: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Failed to validate status transition",
        details: { error: (error as Error).message },
      },
    };
  }
}

/**
 * Check if VISITED status is allowed (FCASH only)
 * @param companyId - Company ID
 * @returns True if VISITED status is allowed
 */
export async function isVisitedStatusAllowed(
  companyId: string,
): Promise<boolean> {
  try {
    const company = await db
      .select({ code: companies.code })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    const isFCASH = company[0]?.code === FCASH_COMPANY_CODE;

    logger.info("Checked VISITED status allowance", {
      action: "is_visited_status_allowed",
      companyId,
      isAllowed: isFCASH,
    });

    return isFCASH;
  } catch (error) {
    logger.error("Failed to check VISITED status allowance", error as Error, {
      action: "is_visited_status_allowed",
      companyId,
    });

    return false;
  }
}

/**
 * Validate reason selection based on status
 * @param statusId - Status type ID
 * @param reasonId - Status reason ID
 * @returns Validation result
 */
export async function validateReasonForStatus(
  statusId: string,
  reasonId: string,
): Promise<ValidationResult> {
  try {
    // Get status type to get its code
    const statusType = await db
      .select({ code: statusTypes.code })
      .from(statusTypes)
      .where(eq(statusTypes.id, statusId))
      .limit(1);

    if (!statusType[0]) {
      return {
        isValid: false,
        error: {
          code: "STATUS_NOT_FOUND",
          message: "Status type not found",
          details: { statusId },
        },
      };
    }

    // Get reason to check if it belongs to the status
    const reason = await db
      .select({
        id: statusReasons.id,
        statusTypeId: statusReasons.statusTypeId,
        name: statusReasons.name,
      })
      .from(statusReasons)
      .where(eq(statusReasons.id, reasonId))
      .limit(1);

    if (!reason[0]) {
      return {
        isValid: false,
        error: {
          code: "REASON_NOT_FOUND",
          message: "Status reason not found",
          details: { reasonId },
        },
      };
    }

    // Check if reason belongs to the status
    if (reason[0].statusTypeId !== statusId) {
      return {
        isValid: false,
        error: {
          code: "INVALID_REASON_FOR_STATUS",
          message: `Reason "${reason[0].name}" is not valid for status "${statusType[0].code}"`,
          details: {
            statusId,
            reasonId,
            statusName: statusType[0].code,
            reasonName: reason[0].name,
          },
        },
      };
    }

    logger.info("Reason for status validated", {
      action: "validate_reason_for_status",
      statusId,
      reasonId,
      isValid: true,
    });

    return { isValid: true };
  } catch (error) {
    logger.error("Failed to validate reason for status", error as Error, {
      action: "validate_reason_for_status",
      statusId,
      reasonId,
    });

    return {
      isValid: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Failed to validate reason for status",
        details: { error: (error as Error).message },
      },
    };
  }
}

/**
 * Enforce remarks requirement when requires_remarks = true
 * @param statusId - Status type ID
 * @param remarks - Remarks text
 * @returns Validation result
 */
export async function validateRemarksRequired(
  statusId: string,
  remarks?: string,
): Promise<ValidationResult> {
  try {
    // Get status type to check if it requires remarks
    const statusType = await db
      .select({
        code: statusTypes.code,
        name: statusTypes.name,
      })
      .from(statusTypes)
      .where(eq(statusTypes.id, statusId))
      .limit(1);

    if (!statusType[0]) {
      return {
        isValid: false,
        error: {
          code: "STATUS_NOT_FOUND",
          message: "Status type not found",
          details: { statusId },
        },
      };
    }

    // Check if any reason for this status requires remarks
    const reasonsWithRemarks = await db
      .select({
        id: statusReasons.id,
        name: statusReasons.name,
        requiresRemarks: statusReasons.requiresRemarks,
      })
      .from(statusReasons)
      .where(eq(statusReasons.statusTypeId, statusId));

    // If any reason requires remarks, check if remarks are provided
    const requiresRemarks = reasonsWithRemarks.some((r) => r.requiresRemarks);

    if (requiresRemarks && (!remarks || remarks.trim().length === 0)) {
      return {
        isValid: false,
        error: {
          code: "REMARKS_REQUIRED",
          message: "Remarks are required for this status",
          details: {
            statusId,
            statusName: statusType[0].name,
          },
        },
      };
    }

    logger.info("Remarks requirement validated", {
      action: "validate_remarks_required",
      statusId,
      hasRemarks: !!remarks,
      isValid: true,
    });

    return { isValid: true };
  } catch (error) {
    logger.error("Failed to validate remarks requirement", error as Error, {
      action: "validate_remarks_required",
      statusId,
    });

    return {
      isValid: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Failed to validate remarks requirement",
        details: { error: (error as Error).message },
      },
    };
  }
}

/**
 * Handle terminal status logic
 * @param statusId - Status type ID
 * @returns True if status is terminal
 */
export async function isTerminalStatus(statusId: string): Promise<boolean> {
  try {
    const statusType = await db
      .select({ code: statusTypes.code })
      .from(statusTypes)
      .where(eq(statusTypes.id, statusId))
      .limit(1);

    if (!statusType[0]) {
      return false;
    }

    const isTerminal = TERMINAL_STATUSES.includes(statusType[0].code);

    logger.info("Checked terminal status", {
      action: "is_terminal_status",
      statusId,
      isTerminal,
    });

    return isTerminal;
  } catch (error) {
    logger.error("Failed to check terminal status", error as Error, {
      action: "is_terminal_status",
      statusId,
    });

    return false;
  }
}

/**
 * Full validation for status update
 * @param data - Status update input
 * @returns Validation result
 */
export async function validateStatusUpdate(
  data: StatusUpdateInput,
): Promise<ValidationResult> {
  try {
    // Get current and target status codes
    let fromStatusCode = "PENDING"; // Default if no previous status
    let toStatusCode = "";

    if (data.fromStatusId) {
      const fromStatus = await db
        .select({ code: statusTypes.code })
        .from(statusTypes)
        .where(eq(statusTypes.id, data.fromStatusId))
        .limit(1);

      if (fromStatus[0]) {
        fromStatusCode = fromStatus[0].code;
      }
    }

    const toStatus = await db
      .select({ code: statusTypes.code })
      .from(statusTypes)
      .where(eq(statusTypes.id, data.toStatusId))
      .limit(1);

    if (!toStatus[0]) {
      return {
        isValid: false,
        error: {
          code: "STATUS_NOT_FOUND",
          message: "Target status not found",
          details: { toStatusId: data.toStatusId },
        },
      };
    }

    toStatusCode = toStatus[0].code;

    // Validate status transition
    const transitionResult = await validateStatusTransition(
      fromStatusCode,
      toStatusCode,
      data.companyId,
    );

    if (!transitionResult.isValid) {
      return transitionResult;
    }

    // Validate reason if provided
    if (data.reasonId) {
      const reasonResult = await validateReasonForStatus(
        data.toStatusId,
        data.reasonId,
      );

      if (!reasonResult.isValid) {
        return reasonResult;
      }
    }

    // Validate remarks requirement
    const remarksResult = await validateRemarksRequired(
      data.toStatusId,
      data.remarks,
    );

    if (!remarksResult.isValid) {
      return remarksResult;
    }

    logger.info("Status update validated", {
      action: "validate_status_update",
      clientPeriodStatusId: data.clientPeriodStatusId,
      fromStatus: fromStatusCode,
      toStatus: toStatusCode,
      isValid: true,
    });

    return { isValid: true };
  } catch (error) {
    logger.error("Failed to validate status update", error as Error, {
      action: "validate_status_update",
      clientPeriodStatusId: data.clientPeriodStatusId,
    });

    return {
      isValid: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Failed to validate status update",
        details: { error: (error as Error).message },
      },
    };
  }
}
