"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Upload,
  X,
  Loader2,
  Wrench,
  Mail,
  Link2,
  Unlink,
  User,
  ShieldCheck,
  Copyright
} from "lucide-react";
import { toolsApi, type Tool, type ToolConnection } from "@/lib/api/tools";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cloneApi } from "@/lib/api/clone";
import { toast } from "sonner";
import { ActivationView } from "./activation";
import { ProfileSidebar } from "./profile-sidebar";
import { cn } from "@/lib/utils";

import { authApi, type User as AuthUser } from "@/lib/api/auth";

export function MyCloneView({ user }: { user?: AuthUser }) {
  const [cloneId, setCloneId] = React.useState<string | null>(null);

  // Knowledge Upload State
  const [knowledgeFiles, setKnowledgeFiles] = React.useState<File[]>([]);
  const [isUploadingKnowledge, setIsUploadingKnowledge] = React.useState(false);
  const knowledgeInputRef = React.useRef<HTMLInputElement>(null);

  // 1. Fetch Status to get Clone ID
  const {
    data: statusData,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ["cloneStatus"],
    queryFn: () => cloneApi.getStatus(),
  });

  React.useEffect(() => {
    if (statusData?.clone_id) {
      setCloneId(statusData.clone_id);
    }
  }, [statusData]);

  // 2. Fetch Clone Details
  const {
    data: clone,
    isLoading: isCloneLoading,
    error: cloneError,
    refetch: refetchClone,
  } = useQuery({
    queryKey: ["clone", cloneId],
    queryFn: () => cloneApi.getClone(cloneId!),
    enabled: !!cloneId,
  });

  // --- HANDLERS ---

  // Knowledge Upload Handlers
  const handleKnowledgeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    // Simple validation
    const oversizedFiles = files.filter((f) => f.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error("Files must be under 10MB each");
      return;
    }
    setKnowledgeFiles((prev) => [...prev, ...files]);
    if (knowledgeInputRef.current) knowledgeInputRef.current.value = "";
  };

  const removeKnowledgeFile = (index: number) => {
    setKnowledgeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadKnowledge = async () => {
    if (knowledgeFiles.length === 0 || !cloneId) return;
    setIsUploadingKnowledge(true);
    try {
      const result = await cloneApi.enhanceKnowledge(cloneId, knowledgeFiles);
      toast.success("Knowledge uploaded!", {
        description: `${result.files_uploaded} files added.`,
      });
      setKnowledgeFiles([]);
      refetchClone();
    } catch {
      toast.error("Failed to upload files");
    } finally {
      setIsUploadingKnowledge(false);
    }
  };

  // --- TOOLS LOGIC ---
  const queryClient = useQueryClient();
  const { data: tools, isLoading: toolsLoading } = useQuery({
    queryKey: ["tools"],
    queryFn: () => toolsApi.list(),
  });

  const { data: toolConnections, isLoading: connectionsLoading } = useQuery({
    queryKey: ["tool-connections"],
    queryFn: () => toolsApi.getConnections(),
  });

  const disconnectToolMutation = useMutation({
    mutationFn: (connectionId: string) => toolsApi.disconnect(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      queryClient.invalidateQueries({ queryKey: ["tool-connections"] });
      toast.success("Tool disconnected");
    },
  });

  // Loading State
  if (isStatusLoading || (cloneId && isCloneLoading)) {
    return <MyCloneSkeleton />;
  }

  // Processing State
  if (statusData?.status === "processing" && cloneId) {
    return (
      <div className="flex-1 overflow-auto bg-white">
        <ActivationView
          cloneId={cloneId}
          cloneName={
            clone?.name || user?.name ? `${user?.name}'s Clone` : "Your Clone"
          }
          userImage={clone?.image_data?.frontal || undefined}
          onComplete={() => {
            refetchStatus();
            refetchClone();
            toast.success("Your person is ready!");
          }}
        />
      </div>
    );
  }

  // Error State
  if (
    cloneError ||
    (statusData?.status !== "completed" && statusData?.status !== "processing")
  ) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[60vh]">
        <h2 className="text-2xl font-semibold mb-2 text-slate-900">
          No Active Person Found
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
          You haven&apos;t created a digital person yet. Start by creating your
          digital twin to represent you.
        </p>
        <Button size="lg" className="rounded-full px-8">
          Create Person
        </Button>
      </div>
    );
  }

  // Data Ready
  const cloneData = clone;
  const personality = (cloneData?.personality as { traits?: string[]; values?: string[]; speaking_style?: string; quirks?: string[]; knowledge_areas?: string[] }) || {};
  const traits = personality?.traits;
  const values = personality?.values;
  const speakingStyle = personality?.speaking_style;
  const quirks = personality?.quirks;
  const knowledgeAreas = personality?.knowledge_areas;

  let displayName = user?.name || clone?.name || "My Person";
  if (displayName.includes("undefined")) displayName = "My Person";
  displayName = displayName.replace(/'s Clone$/i, "").trim();

  return (
    <div className="flex-1 overflow-auto bg-white h-full">
      <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-full">
        {/* LEFT COLUMN - MAIN CONTENT */}
        <main className="lg:col-span-9 space-y-12 lg:border-r lg:border-slate-100 px-6 pt-12 pb-24 lg:px-12">
          {/* Header */}
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
              {displayName}
            </h1>

            {/* Navigation Tabs */}
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="w-max justify-start h-auto p-0 bg-transparent border-b border-slate-100 gap-8 rounded-none">
                <TabsTrigger
                  value="about"
                  className="rounded-none border-b-2 border-transparent px-0 py-3 font-medium text-slate-500 hover:text-slate-700 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:shadow-none bg-transparent transition-all"
                >
                  Foundation
                </TabsTrigger>
                <TabsTrigger
                  value="personality"
                  className="rounded-none border-b-2 border-transparent px-0 py-3 font-medium text-slate-500 hover:text-slate-700 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:shadow-none bg-transparent transition-all"
                >
                  Personality
                </TabsTrigger>
                <TabsTrigger
                  value="knowledge"
                  className="rounded-none border-b-2 border-transparent px-0 py-3 font-medium text-slate-500 hover:text-slate-700 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:shadow-none bg-transparent transition-all"
                >
                  Knowledge
                </TabsTrigger>
                <TabsTrigger
                  value="tools"
                  className="rounded-none border-b-2 border-transparent px-0 py-3 font-medium text-slate-500 hover:text-slate-700 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:shadow-none bg-transparent transition-all"
                >
                  Tools
                </TabsTrigger>
                <TabsTrigger
                  value="personal"
                  className="rounded-none border-b-2 border-transparent px-0 py-3 font-medium text-slate-500 hover:text-slate-700 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:shadow-none bg-transparent transition-all"
                >
                  Personal Information
                </TabsTrigger>
                <TabsTrigger
                  value="copyright"
                  className="rounded-none border-b-2 border-transparent px-0 py-3 font-medium text-slate-500 hover:text-slate-700 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:shadow-none bg-transparent transition-all"
                >
                  Copyright
                </TabsTrigger>
              </TabsList>

              {/* HOME TAB */}
              <TabsContent
                value="about"
                className="pt-8 space-y-12 animate-in fade-in-50 duration-500"
              >
                {cloneData?.background && (
                  <section className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">
                      Foundation
                    </h2>
                    <p className="text-slate-500 max-w-2xl leading-relaxed">
                      {cloneData.background}
                    </p>
                  </section>
                )}

                {/* Separator removed for cleaner look */}

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    Key Attributes
                  </h2>

                  <div className="space-y-8">
                    {/* Expertise Areas (Moved from Knowledge) */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Expertise Areas
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {knowledgeAreas?.map((area) => (
                          <span
                            key={area}
                            className="px-3 py-1 bg-slate-50 text-slate-700 text-sm font-medium rounded-full border border-slate-100"
                          >
                            {area}
                          </span>
                        )) || (
                            <p className="text-slate-400 italic">
                              General knowledge only.
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Speaking Style
                      </h3>
                      <p className="text-slate-600 leading-relaxed italic">
                        &quot;
                        {speakingStyle || "Casual, conversational, and direct."}
                        &quot;
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>Voice Analysis</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Core Values
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        {values && values.length > 0
                          ? values.join(", ")
                          : "Curiosity, Authenticity, Precision"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>Foundational</span>
                        <span>·</span>
                        <span>Always active</span>
                      </div>
                    </div>
                  </div>
                </section>
              </TabsContent>

              {/* PERSONALITY TAB */}
              <TabsContent
                value="personality"
                className="pt-8 space-y-12 animate-in fade-in-50 duration-500"
              >
                <section className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">
                    Personality Dimensions
                  </h3>
                  <p className="text-slate-500 max-w-2xl">
                    A deep dive into the psychological framework that drives
                    this digital persona.
                  </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mt-8">
                  <div className="space-y-6">
                    <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">
                      Defining Traits
                    </h4>
                    <ul className="space-y-4">
                      {traits?.map((trait, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 mt-2" />
                          <span className="text-slate-700">{trait}</span>
                        </li>
                      )) || (
                          <p className="text-slate-400 italic">
                            No traits defined.
                          </p>
                        )}
                    </ul>
                  </div>
                  <div className="space-y-6">
                    <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">
                      Quirks & Nuances
                    </h4>
                    <ul className="space-y-4">
                      {quirks?.map((quirk, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 mt-2" />
                          <span className="text-slate-700">{quirk}</span>
                        </li>
                      )) || (
                          <p className="text-slate-400 italic">
                            No quirks defined.
                          </p>
                        )}
                    </ul>
                  </div>
                </div>

                {cloneData?.dimensions &&
                  Object.keys(cloneData.dimensions).length > 0 && (
                    <section className="space-y-6">
                      <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">
                        10-Dimension Analysis
                      </h4>
                      <div className="space-y-8">
                        {Object.entries(cloneData.dimensions).map(
                          ([key, value]) => {
                            let content =
                              typeof value === "string"
                                ? value
                                : (value as { content?: string })?.content;

                            // Handle missing content
                            if (
                              !content ||
                              content === "[Needs more information]"
                            ) {
                              content =
                                "Not yet analyzed. Continue training to unlock this dimension.";
                            }

                            const isPlaceholder =
                              content ===
                              "Not yet analyzed. Continue training to unlock this dimension.";

                            return (
                              <div key={key} className="group">
                                <h5 className="font-bold text-slate-800 capitalize mb-1 group-hover:text-indigo-600 transition-colors">
                                  {key}
                                </h5>
                                <p
                                  className={cn(
                                    "leading-relaxed text-sm",
                                    isPlaceholder
                                      ? "text-slate-400 italic"
                                      : "text-slate-600"
                                  )}
                                >
                                  {content}
                                </p>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </section>
                  )}
              </TabsContent>

              {/* KNOWLEDGE TAB */}
              <TabsContent
                value="knowledge"
                className="pt-8 space-y-12 animate-in fade-in-50 duration-500"
              >
                <section className="space-y-6">
                  <h3 className="text-2xl font-bold text-slate-900">
                    Knowledge Base
                  </h3>

                  {/* Knowledge Upload Area (Minimalist) */}
                  <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center space-y-4 hover:bg-slate-50/50 transition-colors">
                    <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                      <Upload className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Upload Knowledge Sources
                      </h4>
                      <p className="text-xs text-slate-500">
                        Drag & drop or click to upload PDF, TXT, MD, DOCX
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                      {knowledgeFiles.length > 0 && (
                        <div className="w-full space-y-2">
                          {knowledgeFiles.map((file, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-xs bg-white border p-2 rounded-md"
                            >
                              <FileText className="w-3 h-3 text-slate-400" />
                              <span className="flex-1 truncate text-left">
                                {file.name}
                              </span>
                              <button
                                onClick={() => removeKnowledgeFile(i)}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            className="w-full bg-slate-900 text-white hover:bg-slate-800"
                            onClick={uploadKnowledge}
                            disabled={isUploadingKnowledge}
                          >
                            {isUploadingKnowledge ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-2" />
                            ) : null}
                            Upload {knowledgeFiles.length} File(s)
                          </Button>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => knowledgeInputRef.current?.click()}
                      >
                        Select Files
                      </Button>
                    </div>
                    <input
                      type="file"
                      ref={knowledgeInputRef}
                      className="hidden"
                      multiple
                      accept=".pdf,.txt,.md,.doc,.docx"
                      onChange={handleKnowledgeSelect}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-8 pt-8">
                    {/* Expertise Areas moved to Home Tab */}

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase text-slate-500 tracking-wider">
                        Source Documents
                      </h4>
                      <div className="space-y-2">
                        {cloneData?.knowledge_files?.map(
                          (file: { name: string } | string, i: number) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-slate-200 transition-all"
                            >
                              <div className="h-8 w-8 bg-white rounded-md flex items-center justify-center border border-slate-100 text-slate-400">
                                <FileText className="size-4" />
                              </div>
                              <span className="text-sm font-medium text-slate-700">
                                {typeof file === "string" ? file : file.name}
                              </span>
                            </div>
                          )
                        )}
                        {(!cloneData?.knowledge_files ||
                          cloneData.knowledge_files.length === 0) && (
                            <p className="text-slate-400 italic text-sm">
                              No documents uploaded yet.
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Original Transcript Commented Out ... */}
              </TabsContent>

              {/* TOOLS TAB */}
              <TabsContent value="tools" className="pt-8 space-y-8 animate-in fade-in-50">
                <section className="space-y-4">
                  <h3 className="text-2xl font-bold text-slate-900">Connected Tools</h3>
                  <p className="text-slate-500">Enable your digital person to access external services and perform actions.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    {toolsLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
                    ) : (
                      tools?.map((tool) => {
                        const connection = toolConnections?.find(c => c.tool_slug === tool.slug);
                        return (
                          <ToolItem
                            key={tool.id}
                            tool={tool}
                            connection={connection}
                            onConnect={async () => {
                              const { auth_url } = await toolsApi.startAuth(tool.slug);
                              window.location.href = auth_url;
                            }}
                            onDisconnect={() => connection && disconnectToolMutation.mutate(connection.id)}
                            isDisconnecting={disconnectToolMutation.isPending && disconnectToolMutation.variables === connection?.id}
                          />
                        );
                      })
                    )}
                  </div>
                </section>
              </TabsContent>

              {/* PERSONAL INFO TAB */}
              <TabsContent value="personal" className="pt-8 space-y-12 animate-in fade-in-50">
                <section className="space-y-6">
                  <h3 className="text-2xl font-bold text-slate-900">Personal Information</h3>
                  <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                        <p className="text-slate-800 font-medium">{user?.name || "Not provided"}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Username</label>
                        <div className="flex items-center gap-2 group">
                          <p className="text-slate-800 font-semibold">@{user?.user_name || "None"}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              if (user?.user_name) {
                                navigator.clipboard.writeText(user.user_name);
                                toast.success("Username copied!");
                              }
                            }}
                          >
                            <Link2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Digital Identity ID</label>
                        <div className="flex items-center gap-2 group">
                          <p className="text-slate-800 font-mono text-xs">{cloneId || "None"}</p>
                          {cloneId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                navigator.clipboard.writeText(cloneId);
                                toast.success("Identity ID copied!");
                              }}
                            >
                              <Link2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-200/50">
                      <p className="text-sm text-slate-500">This information is used to secure your digital likeness and ensure authenticity during interactions.</p>
                    </div>
                  </div>
                </section>
              </TabsContent>

              {/* COPYRIGHT TAB */}
              <TabsContent value="copyright" className="pt-8 space-y-12 animate-in fade-in-50">
                <section className="space-y-6">
                  <h3 className="text-2xl font-bold text-slate-900">Copyright & Licensing</h3>
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
                    <div className="flex items-center gap-4 text-blue-600">
                      <ShieldCheck className="h-8 w-8" />
                      <div>
                        <h4 className="font-bold text-slate-900">Ownership Verified</h4>
                        <p className="text-sm text-slate-500">You hold the exclusive rights to this digital persona.</p>
                      </div>
                    </div>
                    <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                      <p>© 2026 AIV. All rights reserved. This digital person and its underlying behavioral model are the property of the creator.</p>
                      <p>Usage is governed by the standard AIV Platform license for digital twins. Any unauthorized duplication or redistribution of this model is strictly prohibited.</p>
                    </div>
                  </div>
                </section>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* RIGHT COLUMN - STICKY SIDEBAR */}
        <ProfileSidebar cloneId={cloneId} user={user} />
      </div>
    </div>
  );
}

function ToolItem({
  tool,
  connection,
  onConnect,
  onDisconnect,
  isDisconnecting,
}: {
  tool: Tool;
  connection?: ToolConnection;
  onConnect: () => void;
  onDisconnect: () => void;
  isDisconnecting?: boolean;
}) {
  const isConnected = !!connection;
  const getToolIcon = (slug: string) => {
    switch (slug) {
      case "gmail": return <Mail className="h-5 w-5 text-red-500" />;
      default: return <Wrench className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      isConnected ? "bg-blue-50/50 border-blue-200" : "bg-white border-slate-100 hover:border-slate-200"
    )}>
      <div className="flex items-start gap-4">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", isConnected ? "bg-white shadow-sm" : "bg-slate-100")}>
          {tool.icon_url ? <img src={tool.icon_url} alt={tool.name} className="h-6 w-6" /> : getToolIcon(tool.slug)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-800">{tool.name}</h4>
            {isConnected && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full uppercase">Active</span>}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{tool.description}</p>
          <div className="mt-3 flex gap-2">
            {isConnected ? (
              <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-full border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100" onClick={onDisconnect} disabled={isDisconnecting}>
                {isDisconnecting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Disconnect
              </Button>
            ) : (
              <Button size="sm" className="h-7 text-[10px] rounded-full bg-slate-900 text-white" onClick={onConnect}>
                Connect Account
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MyCloneSkeleton() {
  return (
    <div className="flex-1 p-6 lg:p-12 space-y-8 max-w-screen-xl mx-auto h-full">
      <div className="flex gap-12">
        <div className="flex-1 space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        </div>
        <div className="w-80 space-y-6">
          <Skeleton className="h-32 w-32 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
