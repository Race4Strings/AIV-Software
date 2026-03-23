'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { contactsApi, type Contact } from '@/lib/api/contacts'
import { chatsApi } from '@/lib/api/chats'
import { workspacesApi } from '@/lib/api/workspaces'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Plus,
  Loader2,
  Bot,
  Star,
  MessageSquare
} from 'lucide-react'

interface NewChatDialogProps {
  workspaceId?: string
  onChatCreated?: (chatId: string) => void
  children?: React.ReactNode
}

export function NewChatDialog({ workspaceId, onChatCreated, children }: NewChatDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [initialMessage, setInitialMessage] = useState('')
  const [chatTitle, setChatTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Fetch contacts
  const { data: contacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsApi.list(),
    enabled: open,
  })

  // Fetch workspaces to get default
  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspacesApi.list(),
    enabled: open && !workspaceId,
  })

  const activeWorkspaceId = workspaceId || workspaces?.find(w => w.is_default)?.id

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedContacts([])
      setInitialMessage('')
      setChatTitle('')
    }
  }, [open])

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleCreateChat = async () => {
    if (selectedContacts.length === 0 || !activeWorkspaceId) {
      toast.error('Please select at least one contact')
      return
    }

    setIsCreating(true)
    try {
      // Get clone IDs from selected contacts
      const selectedCloneIds = contacts
        ?.filter(c => selectedContacts.includes(c.id) && c.contact_type === 'clone')
        .map(c => c.clone?.id)
        .filter(Boolean) as string[]

      const selectedUserIds = contacts
        ?.filter(c => selectedContacts.includes(c.id) && c.contact_type === 'user')
        .map(c => c.user?.id)
        .filter(Boolean) as string[]

      const chat = await chatsApi.create(activeWorkspaceId, {
        title: chatTitle || undefined,
        participant_clone_ids: selectedCloneIds,
        participant_user_ids: selectedUserIds.length > 0 ? selectedUserIds : undefined,
        initial_message: initialMessage || undefined,
      })

      toast.success('Chat created!', {
        description: initialMessage ? 'Waiting for response...' : 'Start chatting now',
      })

      setOpen(false)
      onChatCreated?.(chat.id)
    } catch (error) {
      console.error('Failed to create chat:', error)
      toast.error('Failed to create chat', {
        description: (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Please try again',
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Clone contacts only (for now)
  const cloneContacts = contacts?.filter(c => c.contact_type === 'clone') || []
  const favoriteContacts = cloneContacts.filter(c => c.is_favorite)
  const otherContacts = cloneContacts.filter(c => !c.is_favorite)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
          <DialogDescription>
            Select contacts to start a conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Chat Title (optional) */}
          <div>
            <Input
              placeholder="Chat title (optional)"
              value={chatTitle}
              onChange={(e) => setChatTitle(e.target.value)}
            />
          </div>

          {/* Contact List */}
          <div className="border rounded-lg max-h-60 overflow-y-auto">
            {isLoadingContacts ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : cloneContacts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bot className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No contacts yet</p>
                <p className="text-xs mt-1">Search for clones to add to your contacts</p>
              </div>
            ) : (
              <div className="divide-y">
                {/* Favorites first */}
                {favoriteContacts.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 bg-muted/50 text-xs font-medium text-muted-foreground">
                      ⭐ Favorites
                    </div>
                    {favoriteContacts.map(contact => (
                      <ContactItem
                        key={contact.id}
                        contact={contact}
                        isSelected={selectedContacts.includes(contact.id)}
                        onToggle={() => toggleContact(contact.id)}
                      />
                    ))}
                  </>
                )}
                
                {/* Other contacts */}
                {otherContacts.length > 0 && (
                  <>
                    {favoriteContacts.length > 0 && (
                      <div className="px-3 py-1.5 bg-muted/50 text-xs font-medium text-muted-foreground">
                        All Contacts
                      </div>
                    )}
                    {otherContacts.map(contact => (
                      <ContactItem
                        key={contact.id}
                        contact={contact}
                        isSelected={selectedContacts.includes(contact.id)}
                        onToggle={() => toggleContact(contact.id)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Initial Message (optional) */}
          <div>
            <Input
              placeholder="Initial message (optional)"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Send a message when creating the chat
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateChat} 
            disabled={selectedContacts.length === 0 || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                Create Chat ({selectedContacts.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Contact item component
function ContactItem({ 
  contact, 
  isSelected, 
  onToggle 
}: { 
  contact: Contact
  isSelected: boolean
  onToggle: () => void
}) {
  const name = contact.nickname || contact.clone?.name || contact.user?.name || 'Unknown'
  const avatar = contact.clone?.avatar_icon_url || contact.user?.avatar

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 transition-colors ${
        isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
      }`}
    >
      <Checkbox checked={isSelected} />
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatar} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium">{name}</p>
        {contact.clone?.description && (
          <p className="text-xs text-muted-foreground truncate">
            {contact.clone.description}
          </p>
        )}
      </div>
      {contact.is_favorite && (
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
      )}
    </button>
  )
}
