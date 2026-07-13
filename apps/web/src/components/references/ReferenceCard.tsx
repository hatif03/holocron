"use client";

import { Badge, Button, Card } from "@/components/ui";

export interface ReferenceItem {
  id: string;
  title: string;
  authors: string;
  year: number | null;
  url?: string;
  linked_node_count?: number;
  analysis?: Record<string, unknown>;
}

interface ReferenceCardProps {
  reference: ReferenceItem;
  onEdit: () => void;
  onDelete: () => void;
}

export function ReferenceCard({ reference: item, onEdit, onDelete }: ReferenceCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-semibold text-sm">{item.title}</h3>
            {item.year && (
              <span className="text-xs text-muted-foreground">{item.year}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{item.authors}</p>
          <div className="flex items-center gap-2 mt-2">
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                URL
              </a>
            )}
            <Badge variant="success">
              Linked to {item.linked_node_count ?? 0} nodes
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
