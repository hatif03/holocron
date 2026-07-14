"use client";

import Link from "next/link";
import { Trash2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { generationFilesUrl } from "@/lib/storage-utils";

export interface GenerationItem {
  id: string;
  title: string;
  work_title?: string;
  status: string;
  word_count: number;
  review_count?: number;
  current_step?: string;
  pdf_path?: string;
  created_at: string;
}

interface GenerationCardProps {
  gen: GenerationItem;
  onDelete: () => void;
}

function pdfUrl(genId: string, pdfPath?: string) {
  return generationFilesUrl(genId, pdfPath);
}

export function GenerationCard({ gen, onDelete }: GenerationCardProps) {
  const isRunning = gen.status === "running" || gen.status === "pending";
  const isCompleted = gen.status === "completed" || gen.status === "completed_with_warnings";
  const href = pdfUrl(gen.id, gen.pdf_path);

  return (
    <Card className="p-5 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/paper-generation/${gen.id}`} className="flex-1 min-w-0">
          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
            {gen.title || gen.work_title}
          </h3>
          {isRunning && gen.current_step && (
            <p className="text-sm text-muted-foreground mt-1">{gen.current_step}</p>
          )}
          {isCompleted && (
            <p className="text-sm text-muted-foreground mt-1">
              {gen.word_count > 0 && `${gen.word_count.toLocaleString()} words`}
              {gen.review_count != null && gen.review_count > 0 && ` · ${gen.review_count} reviews`}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">{formatDate(gen.created_at)}</p>
        </Link>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Badge variant={isCompleted ? "success" : "default"}>
            {isRunning ? "Running" : isCompleted ? "Completed" : gen.status}
          </Badge>
          <div className="flex gap-1">
            {href && isCompleted && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center h-8 px-3 text-sm rounded-lg border border-border hover:bg-muted"
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                PDF
              </a>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
