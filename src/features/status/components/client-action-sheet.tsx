"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export interface ClientActionSheetProps {
  open: boolean;
  onClose: () => void;
  clientName: string;
  activeTab?: string;
  onTabChange?: (value: string) => void;
  children?: React.ReactNode;
}

export function ClientActionSheet({
  open,
  onClose,
  clientName,
  activeTab = "update-status",
  onTabChange,
  children,
}: ClientActionSheetProps) {
  const [internalActiveTab, setInternalActiveTab] = React.useState(activeTab);

  const handleTabChange = React.useCallback(
    (value: string) => {
      setInternalActiveTab(value);
      onTabChange?.(value);
    },
    [onTabChange],
  );

  // Sync internal state with prop changes
  React.useEffect(() => {
    setInternalActiveTab(activeTab);
  }, [activeTab]);

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="relative">
          <button
            onClick={onClose}
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-0 right-0 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </SheetHeader>

        <div className="mt-4">
          <h2 className="text-2xl font-bold">{clientName}</h2>
        </div>

        <Tabs
          defaultValue={activeTab}
          value={internalActiveTab}
          onValueChange={handleTabChange}
          className="mt-6"
        >
          <TabsList className="grid w-full grid-cols-3 bg-transparent p-0">
            <TabsTrigger
              value="update-status"
              className="relative rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Update Status
            </TabsTrigger>
            <TabsTrigger
              value="client-info"
              className="relative rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Client Info
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="relative rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="update-status" className="mt-4">
            {children}
          </TabsContent>
          <TabsContent value="client-info" className="mt-4">
            <div className="text-sm text-gray-500">
              Client information will be displayed here.
            </div>
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <div className="text-sm text-gray-500">
              Status history will be displayed here.
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
