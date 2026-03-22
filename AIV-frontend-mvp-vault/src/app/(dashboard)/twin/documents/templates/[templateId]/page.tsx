"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileWarning, Scale, FileCheck, UserCheck } from "lucide-react";
import { getTemplateById } from "@/lib/templates";
import { TemplateForm } from "@/components/documents/template-form";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, React.ElementType> = {
  FileWarning,
  Scale,
  FileCheck,
  UserCheck,
};

export default function TemplateFormPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = use(params);
  const router = useRouter();
  const template = getTemplateById(templateId);

  if (!template) {
    return (
      <div className="mx-auto max-w-5xl py-20 text-center">
        <p className="text-lg font-medium text-foreground">
          Template not found
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          The template &quot;{templateId}&quot; does not exist.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/twin/documents/templates")}
        >
          Back to Templates
        </Button>
      </div>
    );
  }

  const Icon = iconMap[template.icon] ?? FileWarning;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/twin/documents/templates")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {template.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {template.description}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <TemplateForm template={template} />
    </div>
  );
}
