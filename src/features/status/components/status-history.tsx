"use client";

import { Clock, User, CheckCircle2, XCircle } from "lucide-react";
import type { StatusEvent } from "../types";
import { useClientStatusHistory } from "../hooks/use-status";
import { StatusBadge } from "./status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface StatusHistoryProps {
  clientId: string;
  limit?: number;
}

export function StatusHistory({ clientId, limit = 50 }: StatusHistoryProps) {
  const {
    data: history,
    isLoading,
    error,
  } = useClientStatusHistory(clientId, limit);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="size-8" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="text-destructive">Failed to load status history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Clock className="text-muted-foreground/50 mx-auto size-12" />
            <p className="text-muted-foreground mt-2 text-sm">
              No status history available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="before:bg-border relative space-y-6 before:absolute before:top-2 before:left-[19px] before:h-[calc(100%-16px)] before:w-0.5">
            {history.map((event, index) => (
              <div key={event.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className="bg-background border-primary relative flex size-10 shrink-0 items-center justify-center rounded-full border-2">
                  {event.hasPayment ? (
                    <CheckCircle2 className="size-5 text-emerald-500" />
                  ) : (
                    <XCircle className="text-muted-foreground size-5" />
                  )}
                </div>

                {/* Event content */}
                <div className="flex-1 space-y-2 pb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={event.status.code} size="sm" />
                        {event.reason && (
                          <span className="text-muted-foreground text-sm">
                            - {event.reason.name}
                          </span>
                        )}
                      </div>
                      {event.remarks && (
                        <p className="text-muted-foreground text-sm">
                          {event.remarks}
                        </p>
                      )}
                    </div>
                    <div className="text-muted-foreground flex flex-col items-end gap-1 text-right text-sm">
                      <div className="flex items-center gap-1">
                        <User className="size-3" />
                        <span className="text-xs">{event.createdBy.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        <span className="text-xs">
                          {formatDate(event.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment status */}
                  <div className="flex items-center gap-2">
                    {event.hasPayment ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        Payment Received
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <XCircle className="size-3" />
                        No Payment
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
