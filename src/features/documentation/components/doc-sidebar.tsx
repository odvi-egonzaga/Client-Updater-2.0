'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import type { DocNode } from '../utils/doc-loader';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DocSidebarProps {
  nodes: DocNode[];
  className?: string;
}

export function DocSidebar({ nodes, className }: DocSidebarProps) {
  const searchParams = useSearchParams();
  const currentDoc = searchParams.get('doc');
  
  // If no doc is selected, we might want to highlight README or nothing
  // But usually README corresponds to 'README.md' id if we clicked it.

  return (
    <div className={cn('pb-12 w-64 border-r h-full bg-muted/10', className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Documentation
          </h2>
          <ScrollArea className="h-[calc(100vh-8rem)] px-1">
            <div className="space-y-1 p-2">
              {nodes.map((node) => (
                <DocNodeItem key={node.id} node={node} currentDoc={currentDoc} />
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function DocNodeItem({ node, currentDoc }: { node: DocNode; currentDoc: string | null }) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Auto-expand if a child is active
  React.useEffect(() => {
    if (node.type === 'directory' && node.children) {
      const hasActiveChild = checkActiveChild(node, currentDoc);
      if (hasActiveChild) {
        setIsOpen(true);
      }
    }
  }, [currentDoc, node]);

  if (node.type === 'directory') {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start font-normal"
          >
            {isOpen ? (
              <ChevronDown className="mr-2 h-4 w-4" />
            ) : (
              <ChevronRight className="mr-2 h-4 w-4" />
            )}
            <Folder className="mr-2 h-4 w-4 text-sky-500" />
            {node.title}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-1">
          {node.children?.map((child) => (
            <DocNodeItem key={child.id} node={child} currentDoc={currentDoc} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  const isActive = currentDoc === node.id || (!currentDoc && node.id === 'README.md');

  return (
    <Button
      asChild
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      className={cn('w-full justify-start font-normal', isActive && 'bg-accent')}
    >
      <Link href={`/?doc=${encodeURIComponent(node.id)}`} scroll={false}>
        <FileText className="mr-2 h-4 w-4 text-slate-500" />
        {node.title}
      </Link>
    </Button>
  );
}

function checkActiveChild(node: DocNode, currentDoc: string | null): boolean {
  if (node.id === currentDoc) return true;
  if (node.children) {
    return node.children.some(child => checkActiveChild(child, currentDoc));
  }
  return false;
}

