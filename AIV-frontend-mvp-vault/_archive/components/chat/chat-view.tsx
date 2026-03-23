"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatsApi, type ChatDetails, type ChatMessage } from "@/lib/api/chats";
import { contactsApi } from "@/lib/api/contacts";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2,
  MessageSquare,
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";

import { EntityIndicator } from "@/components/ui/entity-indicator";
import { ShiningText } from "@/components/ui/shining-text";

interface ChatViewProps {
  chatId?: string;
  currentUserId?: string;
  onBack?: () => void;
}

interface PendingParticipant {
  id: string;
  type: "user" | "clone";
  name: string;
  avatar?: string;
}

export function ChatView({ chatId, currentUserId }: ChatViewProps) {
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [respondingEntity, setRespondingEntity] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // @ mention autocomplete state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(-1); // cursor position of @

  const [pendingParticipants, setPendingParticipants] = useState<
    PendingParticipant[]
  >([]);
  const [currentThreadTarget, setCurrentThreadTarget] = useState<{ id: string, name: string } | null>(null);

  // Add participant mutation
  const addParticipantMutation = useMutation({
    mutationFn: ({ cloneId, userId }: { cloneId?: string; userId?: string }) =>
      chatsApi.addParticipant(chatId!, cloneId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      toast.success("Participant added");
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error("Failed to add participant", {
        description: error.response?.data?.detail || "Please try again",
      });
      // Remove from pending on error (rollback optimistic update)
      setPendingParticipants((prev) => prev.slice(0, -1));
    },
  });

  // Add participant - Immediate save
  const addParticipant = (participant: PendingParticipant) => {
    // 1. Optimistic update
    setPendingParticipants((prev) => [...prev, participant]);

    // 2. Call API immediately
    addParticipantMutation.mutate({
      cloneId: participant.type === "clone" ? participant.id : undefined,
      userId: participant.type === "user" ? participant.id : undefined,
    });
  };

  // Remove participant mutation
  const removeParticipantMutation = useMutation({
    mutationFn: (participantId: string) =>
      chatsApi.removeParticipant(chatId!, participantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      toast.success("Participant removed");
    },
    onError: () => {
      toast.error("Failed to remove participant");
    },
  });

  // Remove participant
  const removeParticipant = (entityId: string, participantId?: string) => {
    // If we have a participantId (meaning it's an existing participant in DB), call API
    if (participantId) {
      removeParticipantMutation.mutate(participantId);
      return;
    }
    // Otherwise it's a pending participant, just remove from local state
    setPendingParticipants((prev) => prev.filter((p) => p.id !== entityId));
  };

  // Fetch chat details
  const { data: chatDetails, isLoading: isLoadingChat } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => chatsApi.get(chatId!),
    enabled: !!chatId,
    // Always refetch on mount to ensure fresh participant data
    refetchOnMount: true,
    staleTime: 0,
    // Keep showing previous data while refetching to prevent flicker
    placeholderData: (previousData) => previousData,
  });

  // Fetch contacts for @ mentions and participant selector
  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => contactsApi.list(),
  });

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatDetails?.messages, scrollToBottom]);

  // Focus input when chat is loaded
  useEffect(() => {
    if (chatDetails && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chatDetails]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => chatsApi.sendMessage(chatId!, content),
    onMutate: async (newContent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["chat", chatId] });

      // Snapshot previous value
      const previousChatDetails = queryClient.getQueryData<ChatDetails>([
        "chat",
        chatId,
      ]);

      // Optimistically update
      if (previousChatDetails) {
        const optimisticMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          chat_id: chatId!,
          sender_type: "user",
          sender_id: "current-user",
          sender_name: "Me",
          content: newContent,
          created_at: new Date().toISOString(),
        };

        queryClient.setQueryData<ChatDetails>(["chat", chatId], (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: [...old.messages, optimisticMessage],
          };
        });
      }

      return { previousChatDetails };
    },
    onError: (
      error: Error & { response?: { data?: { detail?: string } } },
      _newContent: string,
      context: { previousChatDetails?: ChatDetails } | undefined
    ) => {
      // Rollback
      if (context?.previousChatDetails) {
        queryClient.setQueryData(["chat", chatId], context.previousChatDetails);
      }

      toast.error("Failed to send message", {
        description: error.response?.data?.detail || "Please try again",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !chatId || isSending) return;

    const content = inputValue.trim();

    // Determine responding entity for UI feedback
    const participants = chatDetails?.participants || [];
    const cloneParticipants = participants.filter(p => p.participant_type === "clone");

    // Check for mentions in the current message
    const lowerContent = content.toLowerCase();
    // Sort clones by name length (desc) to match longest names first (simple heuristic)
    const sortedClones = [...cloneParticipants].sort((a, b) =>
      (b.clone?.name.length || 0) - (a.clone?.name.length || 0)
    );

    const mentionedClone = sortedClones.find(p =>
      p.clone?.name && lowerContent.includes(`@${p.clone.name.toLowerCase()}`)
    );

    let entityName = "AIV";
    const isExplicitAIV = lowerContent.includes("@aiv");

    if (mentionedClone) {
      entityName = mentionedClone.clone?.name || "AIV";
      // Set as persistent target
      setCurrentThreadTarget({ id: mentionedClone.clone?.id || "", name: entityName });
    } else if (isExplicitAIV) {
      entityName = "AIV";
      setCurrentThreadTarget(null); // Clear target if explicitly calling AIV
    } else if (currentThreadTarget) {
      // Use persistent target if available
      entityName = currentThreadTarget.name;
    } else if (cloneParticipants.length > 0) {
      // If not mentioned and no target, but there are clones, maybe default to the first one?
      // Actually the user said "messages default to going to those people/clones WITHOUT needing to @mention"
      // If there's only one clone, it's easy. If multiple, we need a "active recipient".
      // For now, if there's a target, use it. If not, default to AIV unless there's only one clone.
      if (cloneParticipants.length === 1) {
        entityName = cloneParticipants[0].clone?.name || "AIV";
      }
    }

    setRespondingEntity(entityName);
    setInputValue("");
    // Clear pending participants as they should be handled by the immediate mutation now
    // (though they are removed from pending list by the query invalidation logic ideally,
    // we clear here just in case of lingering state)
    setPendingParticipants([]);
    setIsSending(true);

    try {
      await sendMessageMutation.mutateAsync(content);
    } finally {
      setIsSending(false);
      setRespondingEntity(null);
      inputRef.current?.focus();
    }
  };

  // Handle input change with @ detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInputValue(value);

    // Check if user is typing @ mention
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(atIndex + 1);
      // Only show mentions if @ is at start or after a space, and no space in query
      const charBeforeAt = atIndex > 0 ? value[atIndex - 1] : " ";
      if (
        (charBeforeAt === " " || charBeforeAt === "\n" || atIndex === 0) &&
        !textAfterAt.includes(" ")
      ) {
        setShowMentions(true);
        setMentionQuery(textAfterAt.toLowerCase());
        setMentionIndex(atIndex);
        return;
      }
    }
    setShowMentions(false);
    setMentionQuery("");
    setMentionIndex(-1);
  };

  // Insert mention into input
  const insertMention = (name: string) => {
    if (mentionIndex === -1) return;

    const before = inputValue.substring(0, mentionIndex);
    const cursorPos = inputRef.current?.selectionStart || inputValue.length;
    const after = inputValue.substring(cursorPos);

    const newValue = `${before}@${name} ${after}`;
    setInputValue(newValue);
    setShowMentions(false);
    setMentionQuery("");
    setMentionIndex(-1);

    // Focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = before.length + name.length + 2; // @ + name + space
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Get participants to display (merging pending and existing for the header view)
  const headerParticipants = React.useMemo(() => {
    // Start with existing confirmed participants (exclude current user - we'll add them separately)
    const existing =
      chatDetails?.participants
        .filter((p) => {
          // Include clones
          if (p.participant_type === "clone") return true;
          // Include users if they are not the current user (if currentUserId is known)
          if (p.participant_type === "user" && currentUserId && p.user?.id !== currentUserId) return true;
          // If currentUserId is unknown, we might show duplicates if we aren't careful, 
          // but usually "You" is always active. 
          // Let's assume if it's "user", we hide it unless we are sure it's someone else.
          // Actually, safer to show "Unknown User" than hide a real participant.
          if (p.participant_type === "user" && !currentUserId) return false;
          return false;
        })
        .map((p) => {
          const isMe = (p.participant_type === "user" && currentUserId && p.user?.id === currentUserId) ||
            (p.participant_type === "user" && p.user?.id === "current-user");
          return {
            id: p.clone?.id || p.user?.id || "",
            participantId: p.id, // Real DB ID for removal
            type: p.participant_type,
            name: p.clone?.name || p.user?.name || "Unknown",
            avatar: p.clone?.avatar_icon_url || p.user?.avatar,
            isPending: false,
            isCurrentUser: isMe,
          };
        }) || [];


    // Add valid pending participants that aren't already in the list
    const existingIds = new Set(existing.map((p) => p.id));
    const validPending = pendingParticipants
      .filter((p) => !existingIds.has(p.id))
      .map((p) => ({
        id: p.id,
        participantId: undefined,
        type: p.type,
        name: p.name,
        avatar: p.avatar,
        isPending: true,
        isCurrentUser: false,
      }));

    // Always include current user (You) at the beginning
    const currentUser = {
      id: "current-user",
      participantId: undefined,
      type: "user" as const,
      name: "You",
      avatar: undefined,
      isPending: false,
      isCurrentUser: true,
    };

    return [currentUser, ...existing, ...validPending];
  }, [chatDetails?.participants, pendingParticipants, currentUserId]);

  // Combine participants for display in input area
  const displayParticipants = React.useMemo(() => {
    const existing =
      chatDetails?.participants.map((p) => {
        const isMe = (p.participant_type === "user" && currentUserId && p.user?.id === currentUserId) ||
          (p.participant_type === "user" && p.user?.id === "current-user");
        return {
          id: p.clone?.id || p.user?.id || "",
          participantId: p.id,
          type: p.participant_type,
          name: p.clone?.name || p.user?.name || "Unknown",
          avatar: p.clone?.avatar_icon_url || p.user?.avatar,
          isPending: false,
          isCurrentUser: isMe,
          key: p.id, // use ID as key part
        };
      }) || [];

    // Filter out participants that might be in pending
    const existingIds = new Set(existing.map((p) => p.id));
    const validPending = pendingParticipants
      .filter((p) => !existingIds.has(p.id))
      .map((p) => ({
        ...p,
        participantId: undefined,
        isPending: true,
        isCurrentUser: false,
        key: `pending-${p.id}`, // distinct key
      }));

    return [...existing, ...validPending];
  }, [chatDetails?.participants, pendingParticipants]);

  // Get filtered participants for mention suggestions - ONLY from this chat
  const mentionSuggestions = React.useMemo(() => {
    if (!showMentions || !chatDetails?.participants) return [];

    return chatDetails.participants
      .filter((p) => p.participant_type === "clone" && p.clone)
      .map((p) => ({
        id: p.clone!.id,
        name: p.clone!.name,
        avatar: p.clone?.avatar_icon_url,
      }))
      .filter((s) => {
        if (!mentionQuery) return true;
        return s.name.toLowerCase().includes(mentionQuery);
      })
      .slice(0, 5);
  }, [chatDetails?.participants, showMentions, mentionQuery]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Get selected IDs (pending + existing)
  const selectedIds = new Set([
    ...pendingParticipants.map((p) => p.id),
    ...((chatDetails?.participants
      .map((p) => (p.participant_type === "clone" ? p.clone?.id : p.user?.id))
      .filter(Boolean) as string[]) || []),
  ]);

  const ParticipantSelector = () => {
    const [search, setSearch] = useState("");
    const [index, setIndex] = useState(0);

    // Filter available contacts
    const filteredParticipants = pendingParticipants.filter((p) =>
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
                    // Check if it's a pending participant or existing
                    const isPending = pendingParticipants.some(
                      (p) => p.id === item.id
                    );
                    // We need to find the participantId if it's existing
                    const existingParticipant = chatDetails?.participants.find(
                      (p) => p.clone?.id === item.id || p.user?.id === item.id
                    );

                    removeParticipant(
                      item.id,
                      !isPending ? existingParticipant?.id : undefined
                    );
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
          {!contacts ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {allItems.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground px-4">
                  {contacts &&
                    contacts.length > 0 &&
                    availableContacts.length === 0 &&
                    !search
                    ? "All available contacts are already in this chat."
                    : "No participants found."}
                </div>
              )}

              {/* Selected Participants Group */}
              {filteredParticipants.length > 0 && (
                <div className="overflow-hidden p-1 text-foreground">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Pending Participants
                  </div>
                  {filteredParticipants.map((participant) => {
                    const itemIndex = allItems.findIndex(
                      (i) => i.id === participant.id && i.selectionType === "selected"
                    );
                    const isHighlighted = itemIndex === index;
                    // Check if existing for removal logic
                    const isPending = pendingParticipants.some(
                      (p) => p.id === participant.id
                    );
                    const existingParticipant = chatDetails?.participants.find(
                      (p) =>
                        p.clone?.id === participant.id ||
                        p.user?.id === participant.id
                    );

                    return (
                      <div
                        key={participant.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeParticipant(
                            participant.id,
                            !isPending ? existingParticipant?.id : undefined
                          );
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

  // No chat selected - show empty state
  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center text-center bg-white">
        <div>
          <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <MessageSquare className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="font-semibold text-xl mb-2 text-gray-800">
            Select a chat
          </h3>
          <p className="text-sm text-gray-500 max-w-sm">
            Choose a conversation from the sidebar or start a new chat
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!chatDetails) {
    return (
      <div className="flex-1 flex items-center justify-center text-center bg-white">
        <div>
          <h3 className="font-semibold text-lg text-gray-800">
            Chat not found
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            This chat may have been deleted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Chat Header Removed */}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {/* Conversation Participants Header - ONLY in Voice session (Mocked as false for now) */}
          {false && headerParticipants.length > 0 && (
            <div className="relative flex items-center justify-center gap-4 py-8">
              {headerParticipants.map((p) => {
                const isClone = p.type === "clone";
                const isCurrentUser = p.isCurrentUser;

                return (
                  <div
                    key={p.id}
                    className={cn(
                      "relative inline-block group",
                      p.isPending && "opacity-70",
                      !isCurrentUser && "cursor-pointer"
                    )}
                  >
                    <div className="relative rounded-full">
                      <Avatar className="h-32 w-32 rounded-full border-4 border-white shadow-xl shadow-slate-100 group-hover:ring-4 group-hover:ring-slate-50 transition-all">
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

                    {/* Remove Button for Large Avatar - not shown for current user */}
                    {!isCurrentUser && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeParticipant(p.id, p.participantId);
                        }}
                        className="absolute -top-1 -right-1 h-8 w-8 bg-white hover:bg-red-500 hover:text-white text-slate-400 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all duration-200 shadow-md border border-slate-100 z-20"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10" />
            </div>
          )}

          {chatDetails.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="font-semibold text-lg text-gray-800">
                Start the conversation
              </h3>
              <p className="text-sm text-gray-500 max-w-md mt-1">
                Send a message to start chatting. Use @CloneName to mention a
                specific clone.
              </p>
            </div>
          ) : (
            chatDetails.messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={index === chatDetails.messages.length - 1}
                onCopy={() => copyToClipboard(message.content)}
              />
            ))
          )}

          {/* Typing indicator */}
          {isSending && (
            <div className="flex flex-col gap-1 items-start">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={
                      respondingEntity && respondingEntity !== "AIV"
                        ? chatDetails?.participants.find(
                          (p) => p.clone?.name === respondingEntity
                        )?.clone?.avatar_icon_url
                        : undefined
                    }
                    alt="AI"
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-purple-100 text-purple-600 text-xs font-bold">
                    {respondingEntity ? respondingEntity[0] : "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center">
                  <ShiningText
                    text={`${respondingEntity || currentThreadTarget?.name || "AI"} is responding`}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Input Bar - matching old chat-client design */}
      <div className="p-4 pb-8 bg-white relative shrink-0">
        <div className="max-w-4xl mx-auto relative">
          {/* @ Mention Suggestions Popup - compact width, only chat participants */}
          {showMentions && mentionSuggestions.length > 0 && (
            <div className="absolute bottom-full left-0 mb-2 w-fit min-w-[200px] max-w-[300px] z-50">
              <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-100">
                  <p className="text-xs text-blue-600 font-medium">
                    @ Mention participant
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {mentionSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 transition-colors text-left"
                      onClick={() => insertMention(suggestion.name)}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={suggestion.avatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                          {suggestion.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {suggestion.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div
            className={cn(
              "rounded-2xl border bg-white shadow-sm overflow-hidden transition-colors",
              showMentions
                ? "border-blue-400 ring-2 ring-blue-100"
                : "border-gray-200"
            )}
          >
            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                // Handle Escape to close mention popup
                if (e.key === "Escape" && showMentions) {
                  setShowMentions(false);
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey && !showMentions) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message... (use @name to mention)"
              disabled={isSending}
              rows={1}
              className="w-full resize-none border-0 bg-transparent px-4 pt-3 pb-2 text-base focus:outline-none focus:ring-0 placeholder:text-gray-400 min-h-[44px]"
              style={{ maxHeight: "200px" }}
            />

            {/* Actions Bar */}
            <div
              className={cn(
                "flex items-center justify-between gap-2 px-3 pb-3",
                isSending && "pointer-events-none opacity-50"
              )}
            >
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

                {/* Display participants (existing + pending) as small avatars next to plus button */}
                {displayParticipants.length > 0 && (
                  <div className="flex items-center -space-x-2 hover:space-x-0 ml-2 transition-all duration-300 ease-in-out p-1">
                    <TooltipProvider>
                      {displayParticipants.map((p, i) => (
                        <div
                          key={p.key}
                          className="relative group/avatar transition-all duration-300 ease-in-out"
                          style={{ zIndex: displayParticipants.length - i }}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-default">
                                <Avatar className="h-7 w-7 border-2 border-white ring-offset-background transition-transform group-hover/avatar:scale-105">
                                  <AvatarImage
                                    src={p.avatar}
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="text-[10px] bg-purple-100 text-purple-600 font-medium">
                                    {p.name[0]}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{p.name}</p>
                            </TooltipContent>
                          </Tooltip>

                          {/* Remove button for ALL participants EXCEPT current user (pending or existing) */}
                          {!p.isCurrentUser && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeParticipant(p.id, p.participantId);
                              }}
                              className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-gray-500 hover:bg-red-500 text-white rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center cursor-pointer transition-all duration-200 scale-75 group-hover/avatar:scale-100 z-50 shadow-sm"
                            >
                              <X className="h-2 w-2" />
                            </button>
                          )}
                        </div>
                      ))}
                    </TooltipProvider>
                  </div>
                )}
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full border-gray-200 hover:bg-gray-50"
                  disabled={isSending}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isSending}
                  size="icon"
                  className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSending ? (
                    <Square className="h-4 w-4 fill-current" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Message bubble component - matches old chat-client design
function MessageBubble({
  message,
  isLast,
  onCopy,
}: {
  message: ChatMessage;
  isLast?: boolean;
  onCopy?: () => void;
}) {
  const isUser = message.sender_type === "user";

  // Format time
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // User message - right aligned pill
  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1 w-full">
        <div className="flex items-start gap-2 max-w-[85%]">
          <div className="flex flex-col items-end">
            <div className="rounded-3xl bg-zinc-100 px-5 py-2.5 text-gray-900 w-fit break-words">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
            <span className="text-[10px] text-gray-400 mt-1 mr-2">{time}</span>
          </div>
        </div>
      </div>
    );
  }

  // Clone/AI message - left aligned with avatar and purple styling
  return (
    <div className="group flex flex-col gap-1 items-start">
      {/* Clone identity header */}
      <div className="flex items-center gap-2 mb-1">
        <Avatar className="h-7 w-7">
          <AvatarImage
            src={message.sender_avatar}
            alt={message.sender_name || "Clone"}
            className="object-cover"
          />
          <AvatarFallback className="bg-purple-100 text-purple-600 text-xs font-bold">
            {message.sender_name?.charAt(0) || "A"}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-purple-600">
          {message.sender_name || "AI Assistant"}
        </span>
      </div>

      {/* Message content */}
      <div className="max-w-[85%] rounded-lg py-1 px-0 prose prose-sm prose-slate">
        <div className="text-sm text-gray-800 whitespace-pre-wrap">
          <ReactMarkdown>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Time */}
      <span className="text-[10px] text-gray-400 ml-1">{time}</span>

      {/* Action buttons - show on hover or for last message */}
      <div
        className={cn(
          "flex gap-0 -ml-2 transition-opacity duration-150",
          isLast ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-gray-400 hover:text-gray-600"
          onClick={onCopy}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-gray-400 hover:text-gray-600"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-gray-400 hover:text-gray-600"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
