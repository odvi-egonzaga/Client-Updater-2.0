"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import type { ClientPeriodStatus, PeriodType } from "../types";
import { useUpdateStatus } from "../hooks/use-status";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusUpdateFormProps {
  clientId: string;
  currentStatus?: ClientPeriodStatus;
  companyId: string;
  periodType: PeriodType;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Mock status types and reasons - in production, these would come from API
const STATUS_TYPES = [
  {
    id: "1",
    code: "PENDING",
    name: "Pending",
    requiresRemarks: false,
    isTerminal: false,
    workflowOrder: 1,
  },
  {
    id: "2",
    code: "TO_FOLLOW",
    name: "To Follow",
    requiresRemarks: false,
    isTerminal: false,
    workflowOrder: 2,
  },
  {
    id: "3",
    code: "CALLED",
    name: "Called",
    requiresRemarks: false,
    isTerminal: false,
    workflowOrder: 3,
  },
  {
    id: "4",
    code: "VISITED",
    name: "Visited",
    requiresRemarks: true,
    isTerminal: false,
    workflowOrder: 4,
  },
  {
    id: "5",
    code: "UPDATED",
    name: "Updated",
    requiresRemarks: false,
    isTerminal: false,
    workflowOrder: 5,
  },
  {
    id: "6",
    code: "DONE",
    name: "Done",
    requiresRemarks: false,
    isTerminal: true,
    workflowOrder: 6,
  },
];

const STATUS_REASONS: Record<
  string,
  Array<{ id: string; name: string; requiresRemarks: boolean }>
> = {
  "1": [
    { id: "r1", name: "New Client", requiresRemarks: false },
    { id: "r2", name: "Transferred", requiresRemarks: true },
  ],
  "2": [
    { id: "r3", name: "No Answer", requiresRemarks: false },
    { id: "r4", name: "Busy", requiresRemarks: false },
    { id: "r5", name: "Call Back Later", requiresRemarks: true },
  ],
  "3": [
    { id: "r6", name: "Initial Contact", requiresRemarks: false },
    { id: "r7", name: "Follow-up Call", requiresRemarks: false },
  ],
  "4": [
    { id: "r8", name: "Home Visit", requiresRemarks: true },
    { id: "r9", name: "Office Visit", requiresRemarks: true },
  ],
  "5": [
    { id: "r10", name: "Information Updated", requiresRemarks: false },
    { id: "r11", name: "Documents Received", requiresRemarks: false },
  ],
  "6": [
    { id: "r12", name: "Completed", requiresRemarks: false },
    { id: "r13", name: "Fully Paid", requiresRemarks: true },
  ],
};

// Workflow transitions
const STATUS_WORKFLOW: Record<string, string[]> = {
  PENDING: ["TO_FOLLOW"],
  TO_FOLLOW: ["CALLED"],
  CALLED: ["VISITED", "UPDATED"],
  VISITED: ["UPDATED"],
  UPDATED: ["DONE"],
  DONE: [],
};

export function StatusUpdateForm({
  clientId,
  currentStatus,
  companyId,
  periodType,
  onSuccess,
  onCancel,
}: StatusUpdateFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [statusId, setStatusId] = useState("");
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<string | null>(null);
  const [hasPayment, setHasPayment] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const updateStatus = useUpdateStatus();

  // Get available status options based on current status and workflow
  const getAvailableStatuses = () => {
    if (!currentStatus) {
      return STATUS_TYPES.filter((s) => s.code === "TO_FOLLOW");
    }

    const currentStatusCode = currentStatus.status.code;
    const allowedTransitions = STATUS_WORKFLOW[currentStatusCode] || [];

    return STATUS_TYPES.filter((status) =>
      allowedTransitions.includes(status.code),
    );
  };

  const availableStatuses = getAvailableStatuses();
  const selectedStatus = STATUS_TYPES.find((s) => s.id === statusId);
  const availableReasons = statusId ? STATUS_REASONS[statusId] || [] : [];
  const selectedReason = availableReasons.find((r) => r.id === reasonId);

  // Check if remarks are required
  const remarksRequired =
    selectedStatus?.requiresRemarks || selectedReason?.requiresRemarks || false;

  // Reset reason when status changes
  useEffect(() => {
    if (statusId) {
      setReasonId(null);
      setRemarks(null);
    }
  }, [statusId]);

  // Reset remarks when reason changes
  useEffect(() => {
    if (reasonId) {
      setRemarks(null);
    }
  }, [reasonId]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!statusId) {
      errors.statusId = "Status is required";
    }

    // Only validate remarks if they are required
    if (remarksRequired && (!remarks || remarks.trim().length === 0)) {
      errors.remarks = "Remarks are required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      // Get current period info
      const currentDate = new Date();
      const periodYear = currentDate.getFullYear();
      const periodMonth =
        periodType === "monthly" ? currentDate.getMonth() + 1 : null;
      const periodQuarter =
        periodType === "quarterly"
          ? Math.ceil((currentDate.getMonth() + 1) / 3)
          : null;

      await updateStatus.mutateAsync({
        clientId,
        periodType,
        periodYear,
        periodMonth,
        periodQuarter,
        statusId,
        reasonId,
        remarks,
        hasPayment,
      });

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border p-3">
          <AlertCircle className="size-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Current Status Display */}
      {currentStatus && (
        <div className="bg-muted/50 rounded-lg border p-3">
          <p className="text-muted-foreground text-sm font-medium">
            Current Status
          </p>
          <p className="text-base font-semibold">{currentStatus.status.name}</p>
          {currentStatus.reason && (
            <p className="text-muted-foreground text-sm">
              {currentStatus.reason.name}
            </p>
          )}
        </div>
      )}

      {/* New Status Dropdown */}
      <div className="space-y-2">
        <label htmlFor="statusId" className="text-sm font-medium">
          New Status <span className="text-destructive">*</span>
        </label>
        <select
          id="statusId"
          value={statusId}
          onChange={(e) => setStatusId(e.target.value)}
          className={cn(
            "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
            "focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            validationErrors.statusId &&
              "border-destructive focus-visible:ring-destructive",
          )}
          disabled={updateStatus.isPending}
        >
          <option value="">Select status</option>
          {availableStatuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </select>
        {validationErrors.statusId && (
          <p className="text-destructive text-xs">
            {validationErrors.statusId}
          </p>
        )}
      </div>

      {/* Reason Dropdown */}
      {availableReasons.length > 0 && (
        <div className="space-y-2">
          <label htmlFor="reasonId" className="text-sm font-medium">
            Reason
          </label>
          <select
            id="reasonId"
            value={reasonId || ""}
            onChange={(e) => setReasonId(e.target.value || null)}
            className={cn(
              "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
              "focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            disabled={updateStatus.isPending}
          >
            <option value="">Select reason (optional)</option>
            {availableReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.name}
                {reason.requiresRemarks && " *"}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Remarks Textarea - Always visible in template */}
      <div className="space-y-2">
        <label htmlFor="remarks" className="text-sm font-medium">
          Remarks
        </label>
        <textarea
          id="remarks"
          value={remarks || ""}
          onChange={(e) => setRemarks(e.target.value)}
          rows={6}
          placeholder="Enter remarks..."
          className={cn(
            "border-input flex min-h-[120px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-y",
            validationErrors.remarks &&
              "border-destructive focus-visible:ring-destructive",
          )}
          disabled={updateStatus.isPending}
        />
        {validationErrors.remarks && (
          <p className="text-destructive text-xs">{validationErrors.remarks}</p>
        )}
      </div>

      {/* Payment Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="hasPayment"
          checked={hasPayment}
          onChange={(e) => setHasPayment(e.target.checked)}
          className="border-input text-primary focus:ring-ring h-4 w-4 rounded focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={updateStatus.isPending}
        />
        <label htmlFor="hasPayment" className="text-sm font-medium">
          Payment Received
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={updateStatus.isPending}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={updateStatus.isPending}>
          {updateStatus.isPending && (
            <Loader2 className="mr-2 size-4 animate-spin" />
          )}
          Update Status
        </Button>
      </div>
    </form>
  );
}
