"use client";

import { useRouter } from "next/navigation";
import { FileWarning, Scale, FileCheck, UserCheck, ArrowLeft } from "lucide-react";
import { templates } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, React.ElementType> = {
  FileWarning,
  Scale,
  FileCheck,
  UserCheck,
};

const categoryColors: Record<string, string> = {
  enforcement: "bg-red-500/15 text-red-400 border-red-500/20",
  licensing: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  protection: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

export default function TemplatesPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/twin/documents")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Legal Templates
          </h1>
          <p className="text-muted-foreground">
            Choose a template to generate a legal document backed by your AIV
            identity certification.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((template) => {
          const Icon = iconMap[template.icon] ?? FileWarning;

          return (
            <Card
              key={template.id}
              className="group cursor-pointer border-border/50 bg-background/50 backdrop-blur transition-colors hover:border-primary/40 hover:bg-muted/30"
              onClick={() =>
                router.push(`/twin/documents/templates/${template.id}`)
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge
                    className={
                      categoryColors[template.category] ?? categoryColors.enforcement
                    }
                  >
                    {template.category}
                  </Badge>
                </div>
                <CardTitle className="mt-3 text-lg">{template.name}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {template.fields.filter((f) => f.source === "alcm").length}{" "}
                    auto-populated ·{" "}
                    {template.fields.filter((f) => f.source === "manual").length}{" "}
                    manual fields
                  </span>
                  <span className="font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Use template →
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
