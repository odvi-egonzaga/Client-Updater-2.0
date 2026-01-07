"use client";

import { useState } from "react";
import type { ClientPeriodStatus, PeriodType } from "../types";
import { StatusUpdateForm } from "./status-update-form";
import { ClientActionSheet } from "./client-action-sheet";
import { useClients } from "@/features/clients/hooks/use-clients";

interface StatusUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName?: string;
  currentStatus?: ClientPeriodStatus;
  companyId: string;
  periodType: PeriodType;
}

export function StatusUpdateDialog({
  open,
  onClose,
  clientId,
  clientName: propClientName,
  currentStatus,
  companyId,
  periodType,
}: StatusUpdateDialogProps) {
  const [activeTab, setActiveTab] = useState("update-status");

  // Fetch client name if not provided
  const { data: clientsData } = useClients(1, 100, {});
  const client = clientsData?.data?.find((c) => c.id === clientId);
  const clientName = propClientName || client?.fullName || "Unknown Client";

  const handleSuccess = () => {
    onClose();
  };

  return (
    <ClientActionSheet
      open={open}
      onClose={onClose}
      clientName={clientName}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <StatusUpdateForm
        clientId={clientId}
        currentStatus={currentStatus}
        companyId={companyId}
        periodType={periodType}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </ClientActionSheet>
  );
}
