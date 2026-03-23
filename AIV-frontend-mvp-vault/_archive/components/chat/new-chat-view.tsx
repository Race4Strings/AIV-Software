"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { contactsApi } from "@/lib/api/contacts";
import { chatsApi } from "@/lib/api/chats";
import { workspacesApi } from "@/lib/api/workspaces";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Loader2,
  Plus,
  Mic,
  ArrowUp,
  Square,
  Paperclip,
  UserPlus,
  Check,
  X,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { ShiningText } from "@/components/ui/shining-text";
import { EntityIndicator } from "@/components/ui/entity-indicator";

interface PendingParticipant {
  id: string;
  type: "user" | "clone";
  name: string;
  avatar?: string;
}

interface NewChatViewProps {
  workspaceId?: string;
  onChatCreated: (chatId: string) => void;
  onCancel?: () => void;
}

export function NewChatView({ workspaceId, onChatCreated }: NewChatViewProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [participants, setParticipants] = useState<PendingParticipant[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [respondingEntity, setRespondingEntity] = useState<string | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch contacts
  const { data: contacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => contactsApi.list(),
  });

  // Fetch workspaces to get default
  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspacesApi.list(),
    enabled: !workspaceId,
  });

  const activeWorkspaceId =
    workspaceId || workspaces?.find((w) => w.is_default)?.id;

  // Focus message input when participants are selected
  useEffect(() => {
    if (participants.length > 0 && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [participants]);

  // Add participant
  const addParticipant = (participant: PendingParticipant) => {
    setParticipants((prev) => [...prev, participant]);
  };

  // Remove participant
  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  // Get selected IDs
  const selectedIds = new Set(participants.map((p) => p.id));

  const ParticipantSelector = () => {
    const [search, setSearch] = useState("");
    const [index, setIndex] = useState(0);

    // Filter available contacts
    const filteredParticipants = participants.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );

    const availableContacts =
      contacts?.filter((c) => {
        const id = c.clone?.id || c.user?.id || "";
        if (selectedIds.has(id)) return false;
        const name = c.clone?.name || c.user?.name || "Unknown";
        return name.toLowerCase().includes(search.toLowerCase());
      }) || [];

    // Combine lists for navigation
    const allItems = [
      ...filteredParticipants.map((p) => ({ 
        selectionType: "selected" as const, 
        id: p.id,
        entityType: p.type,
        name: p.name,
        avatar: p.avatar,
      })),
      ...availableContacts.map((c) => ({
        selectionType: "available" as const,
        id: c.clone?.id || c.user?.id || "",
        entityType: c.contact_type as "user" | "clone",
        name: c.clone?.name || c.user?.name || "Unknown",
        avatar: c.clone?.avatar_icon_url || c.user?.avatar,
      })),
    ];

    useEffect(() => {
      setIndex(0);
    }, [search]);

    return (
      <div
        className="flex flex-col overflow-hidden rounded-md bg-popover text-popover-foreground w-full h-full"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search persons..."
            autoFocus
            value={search}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((prev) => Math.min(prev + 1, allItems.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((prev) => Math.max(prev - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                const item = allItems[index];
                if (item) {
                  if (item.selectionType === "selected") {
                    removeParticipant(item.id);
                  } else {
                    addParticipant({
                      id: item.id,
                      type: item.entityType,
                      name: item.name,
                      avatar: item.avatar,
                    });
                  }
                }
              }
            }}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
          {isLoadingContacts ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {allItems.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No participants found.
                </div>
              )}

              {/* Selected Participants Group */}
              {filteredParticipants.length > 0 && (
                <div className="overflow-hidden p-1 text-foreground">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Participants
                  </div>
                  {filteredParticipants.map((participant) => {
                    const itemIndex = allItems.findIndex(
                      (i) => i.id === participant.id && i.selectionType === "selected"
                    );
                    const isHighlighted = itemIndex === index;
                    return (
                      <div
                        key={participant.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeParticipant(participant.id);
                        }}
                        className={cn(
                          "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none group",
                          isHighlighted
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage
                            src={participant.avatar}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-[10px]">
                            {participant.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            {participant.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-center w-4 h-4 ml-auto">
                          <Check className="h-4 w-4 text-blue-600 group-hover:hidden" />
                          <X className="h-4 w-4 text-red-600 hidden group-hover:block" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Available Contacts Group */}
              {availableContacts.length > 0 && (
                <div className="overflow-hidden p-1 text-foreground">
                  <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    <span>Contacts</span>
                    <span className="font-normal">
                      ({availableContacts.length})
                    </span>
                  </div>
                  {availableContacts.map((contact) => {
                    const id = contact.clone?.id || contact.user?.id || "";
                    const name =
                      contact.clone?.name || contact.user?.name || "Unknown";
                    const avatar =
                      contact.clone?.avatar_icon_url || contact.user?.avatar;
                    const type = contact.contact_type as "user" | "clone";
                    const itemIndex = allItems.findIndex(
                      (i) => i.id === id && i.selectionType === "available"
                    );
                    const isHighlighted = itemIndex === index;

                    return (
                      <div
                        key={id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addParticipant({ id, type, name, avatar });
                        }}
                        className={cn(
                          "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                          isHighlighted
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={avatar} className="object-cover" />
                          <AvatarFallback className="text-[10px]">
                            {name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const handleCreateChat = async () => {
    // if (participants.length === 0) {
    //   toast.error("Select at least one participant");
    //   return;
    // }
    if (!messageInput.trim()) {
      toast.error("Enter a message to start the chat");
      return;
    }
    if (!activeWorkspaceId) {
      toast.error("No workspace available");
      return;
    }

    setIsCreating(true);
    setSentMessage(messageInput.trim());

    // Determine responding entity for UI feedback (same logic as chat-view)
    let entityName = "AIV";
    const clones = participants.filter(p => p.type === "clone");
    
    // Check for mentions
    const lowerContent = messageInput.trim().toLowerCase();
    const sortedClones = [...clones].sort((a, b) => 
      (b.name.length || 0) - (a.name.length || 0)
    );

    const mentionedClone = sortedClones.find(p => 
      lowerContent.includes(`@${p.name.toLowerCase()}`)
    );

    if (mentionedClone) {
      entityName = mentionedClone.name || "AIV";
    }
    setRespondingEntity(entityName);

    setMessageInput("");

    try {
      const cloneIds = participants
        .filter((p) => p.type === "clone")
        .map((p) => p.id);

      const chat = await chatsApi.create(activeWorkspaceId, {
        title: messageInput.trim().slice(0, 100),
        participant_clone_ids: cloneIds,
        initial_message: messageInput.trim(),
      });

      // Pre-populate the cache with chat data for instant load
      queryClient.setQueryData(["chat", chat.id], chat);

      // Refresh sidebar chat list and workspace chat counts
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });

      // Small delay to show the typing animation
      setTimeout(() => {
        onChatCreated(chat.id);
      }, 500);
    } catch (error) {
      console.error("Failed to create chat:", error);
      toast.error("Failed to create chat", {
        description: (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Please try again",
      });
      setSentMessage(null);
      setIsCreating(false);
    }
  };

  // Filter available contacts (Logic moved to ParticipantSelector)
  // const filteredParticipants = ...

  // const availableContacts = ...

  // Combine lists for navigation
  // const allFilteredItems = ...

  // Reset highlight when search changes
  // useEffect(() => { ... })

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {sentMessage ? (
          // Simulation view when creating chat
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
              {/* Conversation Participants Header - identical to chat-view */}
              <div className="relative flex items-center justify-center gap-4 py-8">
                {/* Current user (You) */}
                <div className="relative inline-block group">
                  <div className="relative rounded-full">
                    <Avatar className="h-32 w-32 rounded-full border-4 border-white shadow-xl shadow-slate-100 transition-all">
                      <AvatarFallback className="bg-slate-900 text-white text-3xl">
                        You
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {/* Entity Indicator */}
                  <div className="absolute bottom-2 right-2 z-10">
                    <EntityIndicator
                      type="human"
                      isAvailable={true}
                      size="xl"
                    />
                  </div>
                </div>

                {/* All added participants */}
                {participants.map((p) => {
                  const isClone = p.type === "clone";
                  return (
                    <div key={p.id} className="relative inline-block group">
                      <div className="relative rounded-full">
                        <Avatar className="h-32 w-32 rounded-full border-4 border-white shadow-xl shadow-slate-100 transition-all">
                          <AvatarImage
                            src={p.avatar}
                            alt={p.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-slate-900 text-white text-3xl">
                            {p.name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      {/* Entity Indicator */}
                      <div className="absolute bottom-2 right-2 z-10">
                        <EntityIndicator
                          type={isClone ? "ai" : "human"}
                          isAvailable={true}
                          size="xl"
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10" />
              </div>

              {/* User's sent message - matches chat-view MessageBubble */}
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-start gap-2">
                  <div className="max-w-[70%] flex flex-col items-end">
                    <div className="rounded-3xl bg-gray-100 px-5 py-2.5 text-gray-900">
                      <p className="text-sm whitespace-pre-wrap">
                        {sentMessage}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 mr-2">
                      {new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clone responding indicator */}
              <div className="flex items-center gap-3">
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={
                      respondingEntity && respondingEntity !== "AIV"
                        ? participants.find((p) => p.name === respondingEntity)?.avatar
                        : undefined
                    }
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-purple-100 text-purple-600 text-xs font-bold">
                    {respondingEntity ? respondingEntity[0] : "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center">
                  <ShiningText
                    text={`${respondingEntity || "AI"} is responding`}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Center Content: "How can I help you?" and Input
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl flex flex-col items-center gap-8">
              <h1 className="text-3xl font-semibold text-gray-800">
                Where shall we start?
              </h1>

              {/* Input Area */}
              <div className="w-full">
                <div
                  className={cn(
                    "rounded-2xl border bg-white shadow-sm overflow-hidden transition-colors border-gray-200",
                    isCreating && "opacity-50 pointer-events-none"
                  )}
                >
                  <textarea
                    ref={messageInputRef}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCreateChat();
                      }
                    }}
                    placeholder="Message..."
                    disabled={isCreating}
                    rows={1}
                    className="w-full resize-none border-0 bg-transparent px-4 pt-3 pb-2 text-base focus:outline-none focus:ring-0 placeholder:text-gray-400 min-h-[44px]"
                    style={{ maxHeight: "200px" }}
                  />

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2 px-3 pb-3">
                    {/* Left actions */}
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full border-gray-200 hover:bg-gray-50"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem>
                            <Paperclip className="mr-2 h-4 w-4" />
                            <span>Attachment</span>
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <UserPlus className="mr-2 h-4 w-4" />
                              <span>Person</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent
                              className="w-[300px] p-0"
                              onFocusOutside={(e) => e.preventDefault()}
                              onInteractOutside={(e) => e.preventDefault()}
                            >
                              <ParticipantSelector />
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Selected Participants Avatars */}
                      {participants.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="flex items-center -space-x-2 hover:space-x-0 ml-2 transition-all duration-300 ease-in-out p-1 rounded-full hover:bg-gray-100">
                              {participants.slice(0, 3).map((p) => (
                                <Avatar
                                  key={p.id}
                                  className="h-7 w-7 border-2 border-white ring-1 ring-gray-200 transition-all duration-300"
                                >
                                  <AvatarImage
                                    src={p.avatar}
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="text-[10px] bg-purple-100 text-purple-600">
                                    {p.name[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {participants.length > 3 && (
                                <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-medium border-2 border-white ring-1 ring-gray-200 text-gray-600">
                                  +{participants.length - 3}
                                </div>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[300px] p-0"
                            align="start"
                            onFocusOutside={(e) => e.preventDefault()}
                            onPointerDownOutside={(e) => {
                              const target = e.target as HTMLElement;
                              if (
                                target?.closest(
                                  "[data-sonner-toast], [data-sonner-toaster]"
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <ParticipantSelector />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full border-gray-200 hover:bg-gray-50"
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={handleCreateChat}
                        disabled={!messageInput.trim() || isCreating}
                        size="icon"
                        className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-200 disabled:text-gray-400"
                      >
                        {isCreating ? (
                          <Square className="h-4 w-4 fill-current" />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Ghost Buttons for Quick Actions */}
                <div className="flex items-center justify-center gap-2 mt-4 px-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Add Person
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[300px] p-0"
                      align="start"
                      onFocusOutside={(e) => e.preventDefault()}
                      onPointerDownOutside={(e) => {
                        // Allow closing when clicking outside, but not on toasts
                        const target = e.target as HTMLElement;
                        if (
                          target?.closest(
                            "[data-sonner-toast], [data-sonner-toaster]"
                          )
                        ) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <ParticipantSelector />
                    </PopoverContent>
                  </Popover>

                  <Separator orientation="vertical" className="h-4" />

                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => router.push("/?view=training")}
                  >
                    Train Yourself
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
