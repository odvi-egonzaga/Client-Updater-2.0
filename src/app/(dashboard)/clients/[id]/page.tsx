"use client";

import { use } from "react";
import { useClient } from "@/features/clients/hooks/use-clients";
import { ClientDetail } from "@/features/clients/components/client-detail";

interface ClientDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = use(params);
  const { data: clientData, isLoading, error } = useClient(id);
  const client = clientData?.data;

  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className="container mx-auto py-8">
      <ClientDetail
        client={client}
        isLoading={isLoading}
        error={errorMessage}
      />
    </div>
  );
}
