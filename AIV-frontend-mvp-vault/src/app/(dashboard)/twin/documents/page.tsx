"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Plus, Search, Trash2, Edit, Scale, Clock, Upload } from "lucide-react";
import { format } from "date-fns";
import { fetchTwins, Twin } from "@/lib/api/twins";
import { documentApi, Document } from "@/lib/api/documents";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const DOC_TYPES = [
  { value: "contract", label: "Contract" },
  { value: "brand_brief", label: "Brand Brief" },
  { value: "pr_guidelines", label: "PR Guidelines" },
  { value: "usage_terms", label: "Usage Terms" },
  { value: "nda", label: "NDA" },
  { value: "governance", label: "Governance" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

export default function DocumentLibraryPage() {
  const router = useRouter();
  const [twins, setTwins] = useState<Twin[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocType, setNewDocType] = useState("contract");
  const [isCreating, setIsCreating] = useState(false);

  // Upload dialog
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState("other");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const userTwins = await fetchTwins();
        setTwins(userTwins);
        if (userTwins.length > 0) {
          const best = userTwins.find((tw) => tw.bio || tw.category) || userTwins[0];
          const docs = await documentApi.getDocuments(best.id);
          setDocuments(docs);
        }
      } catch (error) {
        console.error("Failed to load documents", error);
        toast.error("Could not load document library");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const activeTwin = twins.find((tw) => tw.bio || tw.category) || twins[0];

  const handleCreateDocument = async () => {
    if (!activeTwin || !newDocTitle.trim()) return;
    setIsCreating(true);
    try {
      const newDoc = await documentApi.createDocument(activeTwin.id, {
        title: newDocTitle,
        doc_type: newDocType,
        status: "draft",
        content: `# ${newDocTitle}\n\nStart writing your document here...`,
      });
      setDocuments([newDoc, ...documents]);
      setIsCreateOpen(false);
      setNewDocTitle("");
      toast.success("Document created.");
      router.push(`/twin/documents/${newDoc.id}`);
    } catch (error) {
      console.error("Failed to create document", error);
      toast.error("Could not create the document.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!activeTwin || !uploadFile) return;
    setIsUploading(true);
    try {
      const text = await readFileAsText(uploadFile);
      const title = uploadFile.name.replace(/\.[^/.]+$/, "");
      const newDoc = await documentApi.createDocument(activeTwin.id, {
        title,
        doc_type: uploadDocType,
        status: "draft",
        content: text,
      });
      setDocuments([newDoc, ...documents]);
      setIsUploadOpen(false);
      setUploadFile(null);
      toast.success("Document uploaded.");
    } catch (error) {
      console.error("Failed to upload document", error);
      toast.error("Could not upload the document.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!activeTwin) return;
    try {
      await documentApi.deleteDocument(activeTwin.id, docId);
      setDocuments(documents.filter((d) => d.id !== docId));
      toast.success("Document deleted.");
    } catch (error) {
      console.error("Failed to delete document", error);
      toast.error("Could not delete the document.");
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || doc.doc_type === typeFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeTwin) {
    return (
      <EmptyState
        icon={FileText}
        title="No Digital Twin Found"
        description="You need to complete onboarding to access the document library."
        ctaLabel="Go to Dashboard"
        ctaHref="/"
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Document Library</h1>
          <p className="text-muted-foreground">Manage contracts, guidelines, and terms for your twin.</p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={() => router.push("/twin/documents/templates")}>
            <Scale className="h-4 w-4" />
            Legal Templates
          </Button>

          {/* Upload Document Dialog */}
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 flex-1 sm:flex-none">
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload an existing document (.txt, .md, .pdf text) and tag it by category.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>File</Label>
                  <div
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/50 p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadFile ? (
                      <>
                        <FileText className="h-8 w-8 text-primary" />
                        <p className="text-sm font-medium">{uploadFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to select a file</p>
                        <p className="text-xs text-muted-foreground">.txt, .md, .doc, .pdf (text only)</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.doc,.docx,.pdf,.rtf"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select value={uploadDocType} onValueChange={setUploadDocType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsUploadOpen(false); setUploadFile(null); }}>Cancel</Button>
                <Button onClick={handleUploadDocument} disabled={!uploadFile || isUploading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Upload
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* New Document Dialog */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 flex-1 sm:flex-none w-full sm:w-auto min-w-[140px]">
                <Plus className="h-4 w-4" />
                New Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Document</DialogTitle>
                <DialogDescription>
                  Create a new document for your digital twin.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Document Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Standard Brand License Agreement"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Category</Label>
                  <Select value={newDocType} onValueChange={setNewDocType}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateDocument} disabled={!newDocTitle.trim() || isCreating}>
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Document
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Document list with filters */}
      <Card className="border-border/50 bg-background/50 backdrop-blur">
        <CardHeader className="border-b border-border/50 px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search documents..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="flex-1 sm:w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              description="Create your first document or upload an existing one."
              className="py-12"
            />
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No documents match your filters.</p>
              <Button variant="link" onClick={() => { setSearchQuery(""); setTypeFilter("all"); setStatusFilter("all"); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="flex flex-col justify-between gap-4 p-6 hover:bg-muted/50 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium hover:underline cursor-pointer" onClick={() => router.push(`/twin/documents/${doc.id}`)}>
                        {doc.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize rounded-full bg-muted px-2 py-0.5">{doc.doc_type.replace("_", " ")}</span>
                        <span>•</span>
                        <span>Updated {format(new Date(doc.updated_at), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0 sm:ml-auto w-full sm:w-auto border-t border-border/50 sm:border-0 pt-4 sm:pt-0">
                    <StatusBadge status={doc.status} />
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/twin/documents/${doc.id}`)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{doc.title}&quot;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteDocument(doc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document History */}
      <Card className="border-border/50 bg-background/50 backdrop-blur">
        <CardHeader className="border-b border-border/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Document History</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No document activity yet.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {[...documents]
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .slice(0, 10)
                .map((doc) => (
                  <div key={`history-${doc.id}`} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {doc.doc_type.replace("_", " ")} · {doc.status}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{format(new Date(doc.updated_at), "MMM d, yyyy")}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(doc.updated_at), "h:mm a")}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Read file content as text
// Read file content as text
async function readFileAsText(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'pdf') {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += (content.items as { str?: string }[])
        .filter((item) => typeof item.str === "string")
        .map((item) => item.str)
        .join(" ") + "\n";
    }
    return text;
  }

  if (extension === 'docx') {
    const mammothModule = await import('mammoth');
    const mammoth = mammothModule.default || mammothModule;
    const arrayBuffer = await file.arrayBuffer();
    // mammoth expects a Buffer, but usually works with ArrayBuffer in browsers if polyfilled, or we use mammoth.browser.js
    // Actually extractRawText accepts { arrayBuffer: ArrayBuffer } in browser too
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
