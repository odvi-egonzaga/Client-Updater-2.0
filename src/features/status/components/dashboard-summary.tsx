"use client";

import { Users, DollarSign, CheckCircle2, TrendingUp } from "lucide-react";
import type { DashboardSummary as DashboardSummaryType } from "../types";
import { StatusBadge } from "./status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { cn } from "@/lib/utils";

interface DashboardSummaryProps {
  summary: DashboardSummaryType;
  loading?: boolean;
}

// Status order for display
const STATUS_ORDER = [
  "PENDING",
  "TO_FOLLOW",
  "CALLED",
  "VISITED",
  "UPDATED",
  "DONE",
];

// Status colors for progress bars
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-500",
  TO_FOLLOW: "bg-blue-500",
  CALLED: "bg-yellow-500",
  VISITED: "bg-green-500",
  UPDATED: "bg-indigo-500",
  DONE: "bg-emerald-500",
};

export function DashboardSummary({ summary, loading }: DashboardSummaryProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="size-8" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusPercentage = (count: number) => {
    if (summary.totalClients === 0) return 0;
    return Math.round((count / summary.totalClients) * 100);
  };

  const maxStatusCount = Math.max(...Object.values(summary.statusCounts), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Clients */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-muted/50 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground size-5" />
              <p className="text-muted-foreground text-sm font-medium">
                Total Clients
              </p>
            </div>
            <p className="mt-2 text-3xl font-bold">{summary.totalClients}</p>
          </div>

          <div className="bg-muted/50 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="text-muted-foreground size-5" />
              <p className="text-muted-foreground text-sm font-medium">
                Payments Received
              </p>
            </div>
            <p className="mt-2 text-3xl font-bold">{summary.paymentCount}</p>
          </div>

          <div className="bg-muted/50 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-muted-foreground size-5" />
              <p className="text-muted-foreground text-sm font-medium">
                Terminal Status
              </p>
            </div>
            <p className="mt-2 text-3xl font-bold">{summary.terminalCount}</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Status Breakdown</h3>
          <div className="space-y-3">
            {STATUS_ORDER.map((status) => {
              const count = summary.statusCounts[status] || 0;
              const percentage = getStatusPercentage(count);
              const barWidth = (count / maxStatusCount) * 100;

              if (count === 0) return null;

              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={status} size="sm" />
                      <span className="text-muted-foreground text-sm">
                        {count} clients
                      </span>
                    </div>
                    <span className="text-sm font-medium">{percentage}%</span>
                  </div>
                  <div className="bg-muted h-2 w-full rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        STATUS_COLORS[status] || "bg-gray-500",
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pension Type Breakdown */}
        {Object.keys(summary.byPensionType).length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Breakdown by Pension Type</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(summary.byPensionType).map(([type, count]) => (
                <div key={type} className="bg-muted/50 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-muted-foreground size-4" />
                    <p className="text-muted-foreground text-sm font-medium">
                      {type}
                    </p>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
