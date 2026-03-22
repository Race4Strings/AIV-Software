"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  AlertCircle,
  Sparkles,
  Pencil,
  Eye,
  Send,
} from "lucide-react";
import { fetchTwins, Twin } from "@/lib/api/twins";
import { fetchLatestCert, Certification } from "@/lib/api/certifications";
import { documentApi } from "@/lib/api/documents";
import type { LegalTemplate, TemplateField } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const STEPS = [
  { label: "Review Auto-Populated", short: "Review" },
  { label: "Fill Required Details", short: "Details" },
  { label: "Edit & Preview", short: "Edit" },
  { label: "Download", short: "Download" },
] as const;

interface TemplateFormProps {
  template: LegalTemplate;
}

export function TemplateForm({ template }: TemplateFormProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [twin, setTwin] = useState<Twin | null>(null);
  const [cert, setCert] = useState<Certification | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiEnhancing, setAiEnhancing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const twins = await fetchTwins();
        const activeTwin = (twins.find((tw) => tw.bio || tw.category) || twins[0]) ?? null;
        setTwin(activeTwin);
        if (activeTwin) {
          const latestCert = await fetchLatestCert(activeTwin.id);
          setCert(latestCert);
        }
      } catch { /* fail silently */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  useEffect(() => {
    if (!twin) return;
    const initial: Record<string, string> = {};
    for (const field of template.fields) {
      if (field.source !== "alcm") continue;
      const resolved = resolveAlcmValue(field, twin, cert);
      if (resolved) initial[field.key] = resolved;
    }
    setValues((prev) => ({ ...initial, ...prev }));
  }, [twin, cert, template.fields]);

  const setValue = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const alcmFields = template.fields.filter((f) => f.source === "alcm");
  const manualFields = template.fields.filter((f) => f.source === "manual");

  const canAdvance = (): boolean => {
    if (step === 0) return alcmFields.filter((f) => f.required).every((f) => values[f.key]?.trim());
    if (step === 1) return manualFields.filter((f) => f.required).every((f) => values[f.key]?.trim());
    return true;
  };

  // Stream AI response helper
  const streamAiResponse = useCallback(async (prompt: string, onChunk: (text: string) => void): Promise<string> => {
    const response = await fetch("/api/backend/aiv/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message: prompt, mode: "assistant" }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) {
            full += parsed.text;
            onChunk(stripCodeFences(full));
          }
        } catch { /* skip */ }
      }
    }
    return full;
  }, []);

  const handleNext = async () => {
    if (step === 1) {
      // Generate base document then stream AI enhancement
      const baseDoc = template.generateDocument(values);
      setGeneratedDoc(baseDoc);
      setStep(2);
      setEnhancing(true);

      try {
        const prompt = `You are a legal document specialist. Enhance the following ${template.name} document to be more professional, legally thorough, and comprehensive. Improve the language, add relevant legal clauses where appropriate, and make the reasoning more detailed based on the user's input. Keep the same markdown format and structure. Do NOT wrap the output in code blocks or add any commentary — return ONLY the enhanced document in plain markdown:\n\n${baseDoc}`;
        const full = await streamAiResponse(prompt, (text) => setGeneratedDoc(text));
        if (full.trim().length > 100) setGeneratedDoc(stripCodeFences(full));
      } catch {
        // Keep the base document if AI enhancement fails
      } finally {
        setEnhancing(false);
      }
    } else if (step === 2) {
      setStep(3);
      if (twin) {
        try {
          await documentApi.createDocument(twin.id, {
            title: template.name,
            doc_type: "contract",
            content: generatedDoc,
            status: "final",
            exportable: true,
          });
          toast.success("Document saved to your library");
        } catch { /* user can still manually save */ }
      }
    } else if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => { if (step > 0) setStep(step - 1); };

  // AI enhance with custom prompt
  const handleAiEnhance = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiEnhancing) return;
    setAiEnhancing(true);
    setAiPrompt("");
    try {
      const fullPrompt = `You are a legal document specialist. The user wants you to modify the following document based on their instruction. Apply the requested changes while keeping the same markdown format. Do NOT wrap the output in code blocks or add any commentary — return ONLY the updated document in plain markdown.\n\nUser instruction: "${prompt}"\n\nDocument:\n${generatedDoc}`;
      const full = await streamAiResponse(fullPrompt, (text) => setGeneratedDoc(text));
      if (full.trim().length > 100) setGeneratedDoc(stripCodeFences(full));
      toast.success("Document updated");
    } catch {
      toast.error("AI enhancement failed");
    } finally {
      setAiEnhancing(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      // Create a container with explicit light-theme styling for PDF
      const container = document.createElement("div");
      container.innerHTML = markdownToHtml(generatedDoc);
      Object.assign(container.style, {
        padding: "40px",
        fontFamily: "Georgia, Times, serif",
        fontSize: "12px",
        lineHeight: "1.6",
        color: "#000000",
        backgroundColor: "#ffffff",
        width: "700px",
        position: "fixed",
        left: "-9999px",
        top: "0",
      });
      // Must be in DOM for html2canvas to render it
      document.body.appendChild(container);

      await html2pdf()
        .set({
          margin: [0.75, 0.75],
          filename: `${template.id}-${Date.now()}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
          },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        })
        .from(container)
        .save();

      document.body.removeChild(container);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF generation failed. Downloading as markdown instead.");
      handleDownload("md");
    }
  };

  const handleDownload = (format: "md" | "txt") => {
    const mime = format === "md" ? "text/markdown" : "text/plain";
    const blob = new Blob([generatedDoc], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.id}-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveDocument = async () => {
    if (!twin) return;
    setSaving(true);
    try {
      await documentApi.createDocument(twin.id, {
        title: template.name,
        doc_type: "contract",
        content: generatedDoc,
        status: "final",
        exportable: true,
      });
      toast.success("Document saved to your library");
    } catch {
      toast.error("Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!twin) {
    return (
      <Card className="mx-auto max-w-lg border-border/50 bg-background/50">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">No Digital Twin Found</p>
          <p className="text-sm text-muted-foreground">Complete onboarding first to use legal templates.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <nav className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <button
              onClick={() => { if (i < step) setStep(i); }}
              disabled={i > step}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${i < step
                  ? "bg-primary text-primary-foreground cursor-pointer"
                  : i === step
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                    : "bg-muted text-muted-foreground"
                }`}
            >
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </button>
            <span className={`hidden text-sm sm:inline ${i === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="mx-1 h-px w-8 bg-border sm:w-12" />}
          </div>
        ))}
      </nav>

      {step === 0 && (
        <StepCard title="Review Auto-Populated Fields" description="These fields were filled from your AIV identity profile. You can edit any of them.">
          <FieldGrid fields={alcmFields} values={values} onChange={setValue} />
        </StepCard>
      )}

      {step === 1 && (
        <StepCard title="Fill Required Details" description="Provide the specifics for this document.">
          <FieldGrid fields={manualFields} values={values} onChange={setValue} />
        </StepCard>
      )}

      {step === 2 && (
        <StepCard
          title="Edit & Preview"
          description={
            enhancing
              ? "AI is enhancing your document with professional legal language..."
              : aiEnhancing
                ? "AI is applying your changes..."
                : "Edit the document directly or ask AI to refine specific sections."
          }
        >
          {/* AI enhancement in progress banner */}
          {(enhancing || aiEnhancing) && (
            <div className="flex items-center gap-3 mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="relative flex h-8 w-8 items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {enhancing ? "AI Enhancement in Progress" : "Applying Changes"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {enhancing ? "Refining legal language and adding professional clauses..." : "Updating document based on your instructions..."}
                </p>
              </div>
            </div>
          )}

          {/* Edit / Preview toggle */}
          {!enhancing && (
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(true)}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                variant={!editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(false)}
                className="gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </Button>
            </div>
          )}

          {/* Document content — editable or preview */}
          {editMode && !enhancing ? (
            <Textarea
              value={generatedDoc}
              onChange={(e) => setGeneratedDoc(e.target.value)}
              className="min-h-[400px] font-mono text-sm leading-relaxed bg-muted/30 border-border/50 resize-y"
              placeholder="Edit your document markdown here..."
            />
          ) : (
            <div className={`prose prose-invert max-w-none rounded-lg border border-border/50 bg-muted/30 p-6 text-sm leading-relaxed transition-opacity ${enhancing || aiEnhancing ? "opacity-80" : "opacity-100"}`}>
              <MarkdownPreview content={generatedDoc} />
            </div>
          )}

          {/* AI prompt bar */}
          {!enhancing && (
            <div className="mt-4 flex gap-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiEnhance(); } }}
                placeholder="Ask AI to refine — e.g. &quot;Make the compensation section more detailed&quot;"
                disabled={aiEnhancing}
                className="flex-1"
              />
              <Button
                onClick={handleAiEnhance}
                disabled={!aiPrompt.trim() || aiEnhancing}
                size="icon"
                className="shrink-0"
              >
                {aiEnhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </StepCard>
      )}

      {step === 3 && (
        <StepCard title="Download Your Document" description="Your document is ready. Choose a format to download.">
          <div className="flex flex-col items-center gap-6 py-8">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <p className="text-lg font-medium">Document Generated Successfully</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={handleDownloadPdf} className="gap-2">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button variant="outline" onClick={() => handleDownload("md")} className="gap-2">
                <Download className="h-4 w-4" /> Download .md
              </Button>
              <Button variant="outline" onClick={() => handleDownload("txt")} className="gap-2">
                <Download className="h-4 w-4" /> Download .txt
              </Button>
            </div>
            <Button variant="secondary" onClick={handleSaveDocument} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Save to Document Library
            </Button>
          </div>
        </StepCard>
      )}

      {step < 3 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBack} disabled={step === 0} className="gap-2">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={handleNext} disabled={!canAdvance() || enhancing || aiEnhancing} className="gap-2">
            {step === 2 ? "Confirm & Continue" : "Next"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip markdown code fences that AI sometimes wraps output in */
function stripCodeFences(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:markdown|md)?\s*\n?/, "");
  cleaned = cleaned.replace(/\n?```\s*$/, "");
  return cleaned.trim();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/50 bg-background/50 backdrop-blur">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FieldGrid({ fields, values, onChange }: { fields: TemplateField[]; values: Record<string, string>; onChange: (key: string, value: string) => void }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((field) => (
        <FieldInput key={field.key} field={field} value={values[field.key] ?? ""} onChange={(v) => onChange(field.key, v)} />
      ))}
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: TemplateField; value: string; onChange: (v: string) => void }) {
  const wrapperClass = field.type === "textarea" ? "sm:col-span-2" : "";
  const isLocked = field.alcmPath?.startsWith("certification_") || field.alcmPath === "certification_hash";

  return (
    <div className={`space-y-1.5 ${wrapperClass} ${isLocked ? "opacity-80" : ""}`}>
      <label className="text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {field.type === "select" && field.options ? (
        <Select value={value} onValueChange={onChange} disabled={isLocked}>
          <SelectTrigger className={isLocked ? "bg-muted/50 cursor-not-allowed" : ""}><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
          </SelectContent>
        </Select>
      ) : field.type === "textarea" ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={4} readOnly={isLocked} className={isLocked ? "bg-muted/50 cursor-not-allowed focus-visible:ring-0" : ""} />
      ) : (
        <Input type={field.type === "url" ? "url" : field.type === "date" ? "date" : "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} readOnly={isLocked} className={isLocked ? "bg-muted/50 cursor-not-allowed focus-visible:ring-0" : ""} />
      )}
      {field.source === "alcm" && <p className="text-xs text-muted-foreground">{isLocked ? "Locked certification data" : "Auto-populated from your identity profile"}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown to HTML (for PDF generation — light theme)
// ---------------------------------------------------------------------------

function markdownToHtml(md: string): string {
  const cleaned = stripCodeFences(md);
  const html = cleaned
    .replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:bold;margin:18px 0 8px;color:#000">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:bold;margin:22px 0 10px;color:#000">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:22px;font-weight:bold;margin:24px 0 12px;color:#000">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code style="background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:11px">$1</code>')
    .replace(/^\* (.+)$/gm, '<li style="margin-left:20px;color:#000">$1</li>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:20px;color:#000">$1</li>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #ddd;margin:16px 0"/>')
    .replace(/\n\n/g, '</p><p style="color:#000;margin:8px 0">')
    .replace(/\n/g, "<br/>")
    .replace(/^/, '<p style="color:#000;margin:8px 0">')
    .replace(/$/, "</p>");
  return html;
}

// ---------------------------------------------------------------------------
// Markdown to JSX renderer
// ---------------------------------------------------------------------------

function MarkdownPreview({ content }: { content: string }) {
  const cleaned = stripCodeFences(content);
  const lines = cleaned.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <h3 key={i} className="mt-3 text-lg font-semibold">{renderInline(line.slice(4))}</h3>;
        if (line.startsWith("## ")) return <h2 key={i} className="mt-4 text-xl font-semibold">{renderInline(line.slice(3))}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold">{renderInline(line.slice(2))}</h1>;
        if (line.startsWith("---")) return <hr key={i} className="my-4 border-border/50" />;
        if (line.startsWith("- ") || line.startsWith("* ")) {
          const text = line.slice(2);
          return <li key={i} className="ml-4 list-disc">{renderInline(text)}</li>;
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i} className="leading-relaxed">{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
    else if (match[3]) parts.push(<code key={match.index} className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{match[3]}</code>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
}

// ---------------------------------------------------------------------------
// ALCM value resolver
// ---------------------------------------------------------------------------

function resolveAlcmValue(field: TemplateField, twin: Twin, cert: Certification | null): string {
  const path = field.alcmPath;
  if (!path) return "";

  if (path === "name") return twin.name || "";
  if (path === "bio") return twin.bio || "";

  if (path === "email") {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const u = parsed.data || parsed;
        if (u.email) return u.email;
      }
    } catch { /* fall through */ }
    if (twin.alcm_data) {
      const val = getNestedValue(twin.alcm_data, "email");
      if (typeof val === "string" && val) return val;
      const contactEmail = getNestedValue(twin.alcm_data, "identity.email");
      if (typeof contactEmail === "string" && contactEmail) return contactEmail;
    }
    return "";
  }

  if (path === "certification_hash") return cert?.hash || "";
  if (path === "certification_date") {
    if (!cert?.created_at) return "";
    return new Date(cert.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }
  if (path === "certification_reference") {
    if (!cert) return "";
    const date = new Date(cert.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    return `${cert.hash} (${date})`;
  }
  if (path === "protected_assets") return buildProtectedAssetsList(twin);

  if (twin.alcm_data) {
    const val = getNestedValue(twin.alcm_data, path);
    if (typeof val === "string") return val;
    if (val !== undefined && val !== null) return String(val);
  }
  return "";
}

function buildProtectedAssetsList(twin: Twin): string {
  const assets: string[] = [];
  if (twin.name) assets.push(`Name / Likeness: ${twin.name}`);
  if (twin.bio) assets.push(`Biography / Persona description`);
  if (twin.voice_status === "cloned" || twin.voice_sample_url) assets.push("Voice / Voice likeness");
  if (twin.alcm_data) {
    for (const section of Object.keys(twin.alcm_data)) {
      const val = twin.alcm_data[section];
      if (val && typeof val === "object" && Object.keys(val as object).length > 0) {
        assets.push(`ALCM Profile Section: ${section.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`);
      }
    }
  }
  return assets.length > 0 ? assets.map((a) => `• ${a}`).join("\n") : "Digital identity, likeness, and associated intellectual property";
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}
