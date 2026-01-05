import React from 'react';
import { getDocsStructure, getDocContent } from './utils/doc-loader';
import { DocSidebar } from './components/doc-sidebar';
import { DocViewer } from './components/doc-viewer';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Activity } from 'lucide-react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

interface DocumentationLayoutProps {
  currentDocId?: string;
}

export async function DocumentationFeature({ currentDocId }: DocumentationLayoutProps) {
  const structure = await getDocsStructure();
  
  // Default to README.md if no doc selected, or if selected doc not found
  const targetId = currentDocId || 'README.md';
  let doc = await getDocContent(targetId);

  // Fallback if not found (e.g. invalid ID)
  if (!doc && targetId !== 'README.md') {
    doc = await getDocContent('README.md');
  }

  // If still no doc (shouldn't happen), show error
  if (!doc) {
    return <div>Documentation not found.</div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
       {/* Header */}
       <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between">
          <div className="flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 lg:hidden">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0">
                 <div className="px-7">
                   <Link href="/" className="font-bold">
                     DTT Framework
                   </Link>
                 </div>
                 <DocSidebar nodes={structure} className="mt-4 border-none" />
              </SheetContent>
            </Sheet>
            <div className="mr-4 hidden md:flex">
              <Link href="/" className="mr-6 flex items-center space-x-2">
                <span className="hidden font-bold sm:inline-block">
                  DTT Framework
                </span>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/health">
                <Button variant="outline" size="sm" className="gap-2">
                <Activity className="h-4 w-4" />
                Health Check
                </Button>
            </Link>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <div className="flex-1 items-start md:grid md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Desktop Sidebar */}
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
           <div className="h-full py-6 pl-8 pr-6 lg:py-8">
             <DocSidebar nodes={structure} className="h-full border-none bg-transparent" />
           </div>
        </aside>
        
        {/* Main Content */}
        <main className="relative py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[1fr_300px]">
          <div className="mx-auto w-full min-w-0">
             <DocViewer doc={doc} />
          </div>
        </main>
      </div>
    </div>
  );
}
