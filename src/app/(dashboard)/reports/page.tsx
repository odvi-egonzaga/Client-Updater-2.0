"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, BarChart3, Users } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Generate and export reports for various data points.
        </p>
      </div>

      {/* Report Categories */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Client Status Report */}
        <Card className="cursor-pointer transition-colors hover:bg-gray-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Client Status Report</CardTitle>
              <FileText className="size-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Generate reports on client status by period, branch, or status type.
            </p>
            <button className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
              <Download className="size-4" />
              Generate Report
            </button>
          </CardContent>
        </Card>

        {/* Performance Report */}
        <Card className="cursor-pointer transition-colors hover:bg-gray-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Performance Report</CardTitle>
              <BarChart3 className="size-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View team and individual performance metrics over time.
            </p>
            <button className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
              <Download className="size-4" />
              Generate Report
            </button>
          </CardContent>
        </Card>

        {/* User Activity Report */}
        <Card className="cursor-pointer transition-colors hover:bg-gray-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Activity Report</CardTitle>
              <Users className="size-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track user login activity and system usage patterns.
            </p>
            <button className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
              <Download className="size-4" />
              Generate Report
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Report Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-center">
            <div className="max-w-md">
              <FileText className="mx-auto size-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Coming Soon</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Report generation and export functionality will be available in a future update.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
