"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  contactsApi,
  type ContactSearchResult as PublicClone,
} from "@/lib/api/contacts";
import { toolsApi, type Tool, type ToolConnection } from "@/lib/api/tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Search,
  Loader2,
  Plus,
  Minus,
  Grid,
  LayoutList,
  UserPlus,
  Users,
  Sparkles,
  Wrench,
  Mail,
  Link2,
  Unlink,
  X,
} from "lucide-react";
import { EntityIndicator } from "@/components/ui/entity-indicator";

interface ContactLibraryProps {
  children?: React.ReactNode;
}

export function ContactLibrary({ children }: ContactLibraryProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("people");
  const [searchQuery, setSearchQuery] = useState("");

  // Track if we're in the middle of a mutation to prevent popover from closing
  const isMutatingRef = React.useRef(false);

  // Handle OAuth callback from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const connected = params.get("connected");
      const error = params.get("error");

      if (connected) {
        toast.success(
          `${connected.charAt(0).toUpperCase() + connected.slice(1)
          } connected successfully!`
        );
        setOpen(true);
        setActiveTab("tools");
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
        queryClient.invalidateQueries({ queryKey: ["tools"] });
        queryClient.invalidateQueries({ queryKey: ["tool-connections"] });
      } else if (error) {
        toast.error("Failed to connect tool", { description: error });
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [queryClient]);

  // Fetch user's contacts
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => contactsApi.list(),
    enabled: open && activeTab === "people",
  });

  // Fetch ALL public clones on open (using dedicated endpoint)
  const { data: allPublicClones, isLoading: clonesLoading } = useQuery({
    queryKey: ["public-clones-all"],
    queryFn: () => contactsApi.listPublic(0, 100),
    enabled: open && activeTab === "people",
  });

  // Search public clones when user types
  const { data: searchedClones, isLoading: searchLoading } = useQuery({
    queryKey: ["contacts-search", searchQuery],
    queryFn: () => contactsApi.search(searchQuery, 50),
    enabled: open && activeTab === "people" && searchQuery.length >= 1,
  });

  // === TOOLS QUERIES ===
  const { data: toolConnections, isLoading: connectionsLoading } = useQuery({
    queryKey: ["tool-connections"],
    queryFn: () => toolsApi.getConnections(),
    enabled: open,
  });

  // Use searched results if searching, otherwise use all public clones
  const publicClones = searchQuery ? searchedClones : allPublicClones;

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: ({ id, type }: { id: string, type: "user" | "clone" }) => {
      isMutatingRef.current = true;
      return type === "user"
        ? contactsApi.add(undefined, id)
        : contactsApi.add(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact added!");
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error("Failed to add contact", {
        description: error.response?.data?.detail || "Please try again",
      });
    },
    onSettled: () => {
      // Delay resetting the flag to allow React to finish re-rendering
      setTimeout(() => {
        isMutatingRef.current = false;
      }, 100);
    },
  });

  // Remove contact mutation
  const removeContactMutation = useMutation({
    mutationFn: (contactId: string) => {
      isMutatingRef.current = true;
      return contactsApi.remove(contactId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact removed");
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error("Failed to remove contact", {
        description: error.response?.data?.detail || "Please try again",
      });
    },
    onSettled: () => {
      // Delay resetting the flag to allow React to finish re-rendering
      setTimeout(() => {
        isMutatingRef.current = false;
      }, 100);
    },
  });

  // Disconnect tool mutation
  const disconnectToolMutation = useMutation({
    mutationFn: (connectionId: string) => toolsApi.disconnect(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      queryClient.invalidateQueries({ queryKey: ["tool-connections"] });
      toast.success("Tool disconnected");
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error("Failed to disconnect tool", {
        description: error.response?.data?.detail || "Please try again",
      });
    },
  });

  const isLoading =
    contactsLoading || clonesLoading || (searchQuery && searchLoading);

  // Get list of clone IDs already in contacts
  const contactCloneIds = React.useMemo(() => {
    return new Set(
      contacts
        ?.filter((c) => c.contact_type === "clone")
        .map((c) => c.clone?.id)
        .filter(Boolean) || []
    );
  }, [contacts]);

  // Sort and group public clones alphabetically
  const sortedPublicClones = React.useMemo(() => {
    if (!publicClones) return [];

    // Filter out clones already in contacts
    const available = publicClones.filter(
      (clone) => !contactCloneIds.has(clone.id)
    );

    // Sort alphabetically by name
    return [...available].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }, [publicClones, contactCloneIds]);

  // Placeholder - we will no longer show "Available People" by default
  const groupedClones = React.useMemo(() => ({}), []);

  // Sort contacts alphabetically
  const sortedContacts = React.useMemo(() => {
    if (!contacts) return [];
    return [...contacts].sort((a, b) => {
      const nameA = a.nickname || a.clone?.name || a.user?.name || "";
      const nameB = b.nickname || b.clone?.name || b.user?.name || "";
      return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
    });
  }, [contacts]);

  const toggleItem = (item: {
    id: string;
    entityId: string;
    isInContacts: boolean;
    type: "user" | "clone";
  }) => {
    if (item.isInContacts) {
      removeContactMutation.mutate(item.id);
    } else {
      addContactMutation.mutate({ id: item.entityId, type: item.type });
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(newOpen) => {
        // Prevent closing while mutations are in progress
        // (DOM changes during re-render can confuse Radix's focus tracking)
        if (!newOpen && isMutatingRef.current) {
          return;
        }
        setOpen(newOpen);
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      {/* Library Popup */}
      <PopoverContent
        className="w-[420px] h-[500px] p-0 mr-1 mt-4 bg-white border-none shadow-[0_4px_24px_rgba(0,0,0,0.08)] rounded-[24px] overflow-hidden flex relative"
        align="end"
        sideOffset={8}
        onPointerDownOutside={(e) => {
          // Prevent popover from closing when interacting with toast notifications
          // (toasts are rendered in portals outside the popover)
          const target = e.target as HTMLElement;
          if (target?.closest("[data-sonner-toast], [data-sonner-toaster]")) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          // Prevent popover from closing when focus moves to toast notifications
          e.preventDefault();
        }}
      >
        {/* Close button - top right of entire popup */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full z-10"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Narrow Sidebar */}
        <div className="w-[110px] flex flex-col py-5 pl-3 pr-1 border-r border-gray-50/50 bg-gray-50/30">
          {/* Header */}
          <div className="mb-4 px-1">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Library
            </div>
          </div>

          <div className="flex-1 space-y-0.5">
            <NavButton
              active={activeTab === "people"}
              onClick={() => setActiveTab("people")}
              label="People"
            />
            <NavButton
              active={activeTab === "workflows"}
              onClick={() => setActiveTab("workflows")}
              label="Workflows"
              disabled
            />
            <NavButton
              active={activeTab === "chats"}
              onClick={() => setActiveTab("chats")}
              label="Chats"
              disabled
            />
            <NavButton
              active={activeTab === "gallery"}
              onClick={() => setActiveTab("gallery")}
              label="Gallery"
              disabled
            />
            <div className="pt-2 mt-2">
              <NavButton
                active={activeTab === "deleted"}
                onClick={() => setActiveTab("deleted")}
                label="Deleted"
                muted
                disabled
              />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white py-5 px-4 h-full min-h-0">
          {activeTab === "people" ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4 gap-2 flex-shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Search contacts..."
                    className="pl-8 h-9 bg-white border border-gray-100 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-lg text-xs shadow-none w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-black hover:bg-gray-50 rounded-full"
                    >
                      <UserPlus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 bg-gray-50/50 p-1 rounded-lg border border-gray-100">
                  <ViewToggleIcon active icon={LayoutList} />
                  <ViewToggleIcon icon={Grid} />
                </div>
              </div>

              {/* List Content - Scrollable */}
              <ScrollArea className="flex-1 -mx-2 px-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-2 pb-2">
                    {/* Section: My Contacts */}
                    {sortedContacts.length > 0 && (
                      <>
                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1 pt-2 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          My Contacts ({sortedContacts.length})
                        </div>
                        {sortedContacts.map((contact) => (
                          <LibraryItem
                            key={contact.id}
                            name={
                              contact.nickname ||
                              contact.clone?.name ||
                              contact.user?.name ||
                              "Unknown"
                            }
                            avatar={
                              contact.clone?.avatar_icon_url ||
                              contact.user?.avatar
                            }
                            type={contact.contact_type}
                            isInContacts={true}
                            onToggle={() =>
                              toggleItem({
                                id: contact.id,
                                entityId:
                                  contact.clone?.id ||
                                  contact.user?.id ||
                                  contact.id,
                                isInContacts: true,
                                type: contact.contact_type,
                              })
                            }
                            isLoading={
                              removeContactMutation.isPending &&
                              removeContactMutation.variables === contact.id
                            }
                          />
                        ))}
                      </>
                    )}

                    {/* Section: Search Results (when searching) */}
                    {searchQuery && sortedPublicClones.length > 0 && (
                      <>
                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1 pt-4 flex items-center gap-1">
                          <Search className="h-3 w-3" />
                          Found People ({sortedPublicClones.length})
                        </div>
                        {sortedPublicClones.map((clone) => (
                          <LibraryItem
                            key={clone.id}
                            name={clone.name}
                            avatar={clone.avatar_icon_url}
                            type={clone.type as "user" | "clone"}
                            isInContacts={false}
                            description={
                              clone.type === "user"
                                ? `@${clone.user_name}`
                                : (clone.owner_name ? `by ${clone.owner_name}` : undefined)
                            }
                            onToggle={() =>
                              toggleItem({
                                id: clone.id,
                                entityId: clone.id,
                                isInContacts: false,
                                type: clone.type as "user" | "clone",
                              })
                            }
                            isLoading={
                              addContactMutation.isPending &&
                              (addContactMutation.variables as any)?.id === clone.id
                            }
                          />
                        ))}
                      </>
                    )}

                    {/* Empty State */}
                    {sortedContacts.length === 0 &&
                      sortedPublicClones.length === 0 && (
                        <div className="text-center py-12">
                          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <Users className="h-8 w-8 text-gray-400" />
                          </div>
                          <h3 className="font-medium text-gray-700 mb-1">
                            No people available
                          </h3>
                          <p className="text-xs text-gray-400 max-w-[200px] mx-auto">
                            {searchQuery
                              ? `No results for "${searchQuery}"`
                              : "Public people will appear here"}
                          </p>
                        </div>
                      )}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            /* Other tabs placeholder */
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-400">Coming soon</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NavButton({
  active,
  label,
  onClick,
  muted,
  disabled,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  muted?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start text-[10px] font-medium px-2.5 py-1.5 h-auto rounded-lg transition-all tracking-wide truncate",
        active
          ? "bg-gray-100 text-gray-900"
          : "text-gray-400 hover:bg-gray-50 hover:text-gray-900",
        muted && "text-gray-300 hover:text-gray-400 mt-auto",
        disabled &&
        "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-400"
      )}
      onClick={disabled ? undefined : onClick}
    >
      {label}
    </Button>
  );
}

function ViewToggleIcon({
  icon: Icon,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-6 w-6 rounded-md transition-all",
        active
          ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-black"
          : "text-gray-300 hover:text-gray-500 hover:bg-white/50"
      )}
    >
      <Icon className="h-3 w-3" />
    </Button>
  );
}

function TypeIndicator({ type }: { type: "user" | "clone" }) {
  return (
    <EntityIndicator
      type={type === "user" ? "human" : "ai"}
      isAvailable={true}
      size="sm"
    />
  );
}

function LibraryItem({
  name,
  avatar,
  type,
  isInContacts,
  description,
  onToggle,
  isLoading,
}: {
  name: string;
  avatar?: string;
  type: "user" | "clone";
  isInContacts: boolean;
  description?: string;
  onToggle: () => void;
  isLoading?: boolean;
}) {
  return (
    <div
      onClick={(e) => {
        // Prevent closing the popover when clicking an item
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "group flex flex-col transition-all border border-transparent rounded-[16px] cursor-pointer",
        isInContacts ? "bg-gray-100/80" : "bg-white hover:bg-gray-50"
      )}
    >
      <div className="flex items-center justify-between p-2 pl-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
              <AvatarImage src={avatar} className="object-cover" />
              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600">
                {name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5">
              <TypeIndicator type={type} />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-medium text-gray-700 truncate">
              {name}
            </span>
            <span className="text-[10px] text-gray-400 truncate">
              {description || (type === "clone" ? "AI Person" : "Human")}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center w-8 h-8 pr-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            disabled={isLoading}
            className={cn(
              "h-6 w-6 rounded-full hover:bg-black/5 transition-all",
              isInContacts ? "text-gray-500" : "text-blue-500"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : isInContacts ? (
              <Minus className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
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

  // Get icon based on tool slug
  const getToolIcon = (slug: string) => {
    switch (slug) {
      case "gmail":
        return <Mail className="h-5 w-5 text-red-500" />;
      default:
        return <Wrench className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        isConnected
          ? "bg-green-50/50 border-green-200"
          : "bg-white border-gray-100 hover:border-gray-200"
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Tool Icon */}
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
            isConnected ? "bg-green-100" : "bg-gray-100"
          )}
        >
          {tool.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tool.icon_url} alt={tool.name} className="h-6 w-6" />
          ) : (
            getToolIcon(tool.slug)
          )}
        </div>

        {/* Tool Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-gray-800">{tool.name}</h4>
            {isConnected && (
              <span className="text-[10px] font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                Connected
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
            {tool.description}
          </p>
        </div>
      </div>

      {/* Connected account */}
      {connection && (
        <div className="flex items-center gap-1.5 mt-3 ml-13 text-[11px] text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5">
          <Link2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{connection.account_email}</span>
        </div>
      )}

      {/* Capabilities */}
      {tool.capabilities && tool.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tool.capabilities.slice(0, 4).map((cap) => (
            <span
              key={cap.name}
              className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md"
            >
              {cap.name.replace(/_/g, " ")}
            </span>
          ))}
          {tool.capabilities.length > 4 && (
            <span className="text-[10px] text-gray-400 px-1 py-1">
              +{tool.capabilities.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Action Button - Full width at bottom */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        {isDisconnecting ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Disconnecting...</span>
          </div>
        ) : isConnected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDisconnect();
            }}
            className="w-full h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <Unlink className="h-3.5 w-3.5 mr-1.5" />
            Disconnect Gmail
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onConnect();
            }}
            className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700"
          >
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            Connect {tool.name}
          </Button>
        )}
      </div>
    </div>
  );
}
