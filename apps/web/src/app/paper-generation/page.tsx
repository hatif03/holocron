"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface Generation {
  id: string;
  title: string;
  work_title: string;
  status: string;
  word_count: number;
  created_at: string;
}

export default function PaperGenerationListPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);

  useEffect(() => {
    fetch("/api/generations")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setGenerations(data));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3 mb-8">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="font-serif text-2xl font-bold">Paper Generation</h1>
      </div>

      <div className="grid gap-4">
        {generations.map((gen) => (
          <Link key={gen.id} href={`/paper-generation/${gen.id}`}>
            <Card className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{gen.title || gen.work_title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {gen.work_title}
                  </p>
                </div>
                <Badge variant={gen.status === "completed" ? "success" : "default"}>
                  {gen.status}
                </Badge>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                {gen.word_count > 0 && <span>{gen.word_count} words</span>}
                <span>{formatDate(gen.created_at)}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {generations.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          No paper generations yet. Build a research graph and click Generate Paper.
        </div>
      )}
    </div>
  );
}
