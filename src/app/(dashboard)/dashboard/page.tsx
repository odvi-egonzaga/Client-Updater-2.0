"use client";

import { useState, useEffect } from "react";
import { useStatusStore } from "@/features/status/stores/status-store";
import { useDashboardSummary } from "@/features/status/hooks/use-status";
import { useClients } from "@/features/clients/hooks/use-clients";
import { PeriodSelector } from "@/features/status/components";
import { StatusBadge } from "@/features/status/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { BarChart3, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const currentPeriod = useStatusStore((state) => state.currentPeriod);
  const setCurrentPeriod = useStatusStore((state) => state.setCurrentPeriod);
  const [selectedBranch, setSelectedBranch] = useState<string>("MNLA01");
  const [selectedStatus, setSelectedStatus] =
    useState<string>("PENDING,TO_FOLLOW");
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize period to monthly
  useEffect(() => {
    setCurrentPeriod({
      periodType: "monthly",
      periodYear: new Date().getFullYear(),
      periodMonth: new Date().getMonth() + 1,
      periodQuarter: null,
    });
  }, [setCurrentPeriod]);

  // Fetch FCASH summary
  const { data: fcashSummary, isLoading: fcashLoading } = useDashboardSummary(
    "FCASH",
    currentPeriod,
  );

  // Fetch PCNI summary
  const { data: pcniSummary, isLoading: pcniLoading } = useDashboardSummary(
    "PCNI",
    currentPeriod,
  );

  // Fetch clients for task list
  const { data: clientsData, isLoading: clientsLoading } = useClients(1, 50, {
    isActive: true,
  });

  // Calculate progress percentages
  const calculateProgress = (summary: any) => {
    if (!summary || !summary.totalClients)
      return { percentage: 0, done: 0, total: 0 };

    const doneCount = summary.statusCounts["DONE"] || 0;
    const percentage = Math.round((doneCount / summary.totalClients) * 100);

    return {
      percentage,
      done: doneCount,
      total: summary.totalClients,
    };
  };

  const fcashProgress = calculateProgress(fcashSummary);
  const pcniProgress = calculateProgress(pcniSummary);

  // Filter clients based on search and filters
  const filteredClients =
    clientsData?.data?.filter((client) => {
      const matchesSearch =
        !searchQuery ||
        client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.clientCode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBranch =
        !selectedBranch ||
        client.clientCode.startsWith(selectedBranch.substring(0, 2));

      return matchesSearch && matchesBranch;
    }) || [];

  const getPeriodLabel = () => {
    if (currentPeriod.periodType === "monthly" && currentPeriod.periodMonth) {
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      return `${months[currentPeriod.periodMonth - 1]} ${currentPeriod.periodYear}`;
    }
    return `${currentPeriod.periodYear}`;
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Period:</span>
        <span className="text-sm text-gray-900">{getPeriodLabel()}</span>
      </div>

      {/* Progress Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* FCASH Progress Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                FCASH Progress
              </CardTitle>
              <BarChart3 className="size-5 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            {fcashLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner className="size-6" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {fcashProgress.percentage}% Done ({fcashProgress.done}/
                      {fcashProgress.total})
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${fcashProgress.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PCNI Progress Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                PCNI Progress
              </CardTitle>
              <BarChart3 className="size-5 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            {pcniLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner className="size-6" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {pcniProgress.percentage}% Done ({pcniProgress.done}/
                      {pcniProgress.total})
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${pcniProgress.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FCASH Workspace - My Tasks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            FCASH Workspace - My Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 sm:flex-initial">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="border-input focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
              >
                <option value="MNLA01">Branch: MNLA01</option>
                <option value="MNLA02">Branch: MNLA02</option>
                <option value="MNLA03">Branch: MNLA03</option>
              </select>
            </div>
            <div className="flex-1 sm:flex-initial">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border-input focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
              >
                <option value="PENDING,TO_FOLLOW">
                  Status: Pending, To Follow
                </option>
                <option value="CALLED">Status: Called</option>
                <option value="VISITED">Status: Visited</option>
                <option value="UPDATED">Status: Updated</option>
                <option value="DONE">Status: Done</option>
              </select>
            </div>
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Task List Table */}
          <div className="overflow-hidden rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="w-12 px-4 py-3 text-left">
                      <input type="checkbox" className="h-4 w-4" />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Client Code
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Pension Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Last Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <LoadingSpinner className="mx-auto size-6" />
                      </td>
                    </tr>
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No clients found
                      </td>
                    </tr>
                  ) : (
                    filteredClients.slice(0, 10).map((client) => (
                      <tr
                        key={client.id}
                        className="cursor-pointer border-b transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <input type="checkbox" className="h-4 w-4" />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {client.clientCode}
                        </td>
                        <td className="px-4 py-3 text-sm">{client.fullName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          Pension
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status="PENDING" size="sm" />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          Last Remarks wraa stream...
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
