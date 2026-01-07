"use client";

import {
  RefreshCw,
  Database,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { SyncJob } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSyncJobs, useTriggerSync } from "../hooks/use-clients";

export function SyncStatus() {
  const { data: jobsData, isLoading, error } = useSyncJobs();
  const triggerSync = useTriggerSync();

  const handleStartSync = async (type: "snowflake" | "nextbank") => {
    try {
      await triggerSync.mutateAsync({ type });
    } catch (error) {
      console.error("Failed to trigger sync:", error);
    }
  };

  const getSyncJobStatusBadge = (status: SyncJob["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="size-3" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="gap-1">
            <RefreshCw className="size-3 animate-spin" />
            Processing
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="size-3" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="size-3" />
            Failed
          </Badge>
        );
      case "dead":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="size-3" />
            Dead
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
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
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner className="size-8" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-destructive text-center">
            Failed to load sync jobs
          </p>
        </CardContent>
      </Card>
    );
  }

  const jobs = jobsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5" />
            Sync Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleStartSync("snowflake")}
              disabled={triggerSync.isPending}
            >
              <RefreshCw
                className={`mr-2 size-4 ${triggerSync.isPending ? "animate-spin" : ""}`}
              />
              Start Snowflake Sync
            </Button>
            <Button
              onClick={() => handleStartSync("nextbank")}
              disabled={triggerSync.isPending}
              variant="outline"
            >
              <RefreshCw
                className={`mr-2 size-4 ${triggerSync.isPending ? "animate-spin" : ""}`}
              />
              Start Nextbank Sync
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No sync jobs found
            </p>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 pr-4">
                {jobs.map((job) => (
                  <Card key={job.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="uppercase">
                              {job.type}
                            </Badge>
                            {getSyncJobStatusBadge(job.status)}
                          </div>

                          <div className="grid gap-2 text-sm">
                            <div>
                              <span className="font-medium">Created:</span>{" "}
                              <span className="text-muted-foreground">
                                {formatDate(job.createdAt)}
                              </span>
                            </div>

                            {job.startedAt && (
                              <div>
                                <span className="font-medium">Started:</span>{" "}
                                <span className="text-muted-foreground">
                                  {formatDate(job.startedAt)}
                                </span>
                              </div>
                            )}

                            {job.completedAt && (
                              <div>
                                <span className="font-medium">Completed:</span>{" "}
                                <span className="text-muted-foreground">
                                  {formatDate(job.completedAt)}
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <span className="font-medium">Processed:</span>{" "}
                                <span className="text-muted-foreground">
                                  {job.recordsProcessed}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Created:</span>{" "}
                                <span className="text-muted-foreground">
                                  {job.recordsCreated}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Updated:</span>{" "}
                                <span className="text-muted-foreground">
                                  {job.recordsUpdated}
                                </span>
                              </div>
                            </div>

                            {job.error && (
                              <div className="bg-destructive/10 rounded-md p-3">
                                <p className="text-destructive text-sm font-medium">
                                  Error:
                                </p>
                                <p className="text-destructive text-sm">
                                  {job.error}
                                </p>
                              </div>
                            )}

                            {job.createdBy && (
                              <div>
                                <span className="font-medium">Created By:</span>{" "}
                                <span className="text-muted-foreground">
                                  {job.createdBy}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
