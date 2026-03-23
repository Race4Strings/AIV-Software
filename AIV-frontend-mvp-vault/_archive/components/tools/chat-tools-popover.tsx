'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toolsApi } from '@/lib/api/tools'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Loader2,
  Wrench,
  Mail,
  Check,
  Plus,
  Settings2
} from 'lucide-react'

interface ChatToolsPopoverProps {
  chatId: string
  children: React.ReactNode
}

export function ChatToolsPopover({ chatId, children }: ChatToolsPopoverProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)

  // Fetch user's connected tools
  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ['tool-connections'],
    queryFn: () => toolsApi.getConnections(),
    enabled: open,
  })

  // Fetch tools already in this chat
  const { data: chatTools, isLoading: chatToolsLoading } = useQuery({
    queryKey: ['chat-tools', chatId],
    queryFn: () => toolsApi.getChatTools(chatId),
    enabled: open,
  })

  // Add tool to chat mutation
  const addToolMutation = useMutation({
    mutationFn: (connectionId: string) => toolsApi.addToChat(chatId, connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-tools', chatId] })
      toast.success('Tool added to chat')
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error('Failed to add tool', {
        description: error.response?.data?.detail || 'Please try again',
      })
    },
  })

  // Remove tool from chat mutation
  const removeToolMutation = useMutation({
    mutationFn: (chatToolId: string) => toolsApi.removeFromChat(chatId, chatToolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-tools', chatId] })
      toast.success('Tool removed from chat')
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error('Failed to remove tool', {
        description: error.response?.data?.detail || 'Please try again',
      })
    },
  })

  const isLoading = connectionsLoading || chatToolsLoading


  // Get icon based on tool slug
  const getToolIcon = (slug: string) => {
    switch (slug) {
      case 'gmail':
        return <Mail className="h-4 w-4 text-red-500" />
      default:
        return <Wrench className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      
      <PopoverContent className="w-[280px] p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-purple-600" />
            <div>
              <h4 className="font-semibold text-sm">Chat Tools</h4>
              <p className="text-[10px] text-gray-500">Add tools your clone can use</p>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : !connections || connections.length === 0 ? (
            <div className="p-4 text-center">
              <div className="h-12 w-12 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 font-medium">No tools connected</p>
              <p className="text-xs text-gray-400 mt-1">
                Connect tools in the Library first
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {connections.map((connection) => {
                const chatTool = chatTools?.find(
                  (ct) => ct.tool_slug === connection.tool_slug
                )
                const isEnabled = !!chatTool
                const isPending = addToolMutation.isPending || removeToolMutation.isPending

                return (
                  <button
                    key={connection.id}
                    onClick={() => {
                      if (isEnabled && chatTool) {
                        removeToolMutation.mutate(chatTool.id)
                      } else {
                        addToolMutation.mutate(connection.id)
                      }
                    }}
                    disabled={isPending}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-lg transition-all',
                      isEnabled 
                        ? 'bg-green-50 hover:bg-green-100' 
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <div className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center',
                      isEnabled ? 'bg-green-100' : 'bg-gray-100'
                    )}>
                      {getToolIcon(connection.tool_slug)}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-800">
                        {connection.tool_name}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {connection.account_email}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : isEnabled ? (
                        <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                          <Plus className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
