"use client";

import { ClientFilters } from "@/features/clients/components/client-filters";
import { ClientTable } from "@/features/clients/components/client-table";
import { useClients } from "@/features/clients/hooks/use-clients";
import { useClientsStore } from "@/features/clients/stores/clients-store";

export default function ClientsPage() {
  const { isLoading, error } = useClients();
  const clients = useClientsStore((state) => state.clients);

  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="text-muted-foreground">
          Manage and view all client information.
        </p>
      </div>

      <div className="space-y-4">
        <ClientFilters />
        <ClientTable
          clients={clients}
          isLoading={isLoading}
          error={errorMessage}
        />
      </div>
    </div>
  );
}
