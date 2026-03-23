'use client'

import * as React from 'react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { workspacesApi, type CreateWorkspaceData } from '@/lib/api/workspaces'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, FolderPlus } from 'lucide-react'


interface NewWorkspaceDialogProps {
  children?: React.ReactNode
  onCreated?: (workspaceId: string) => void
}

export function NewWorkspaceDialog({ children, onCreated }: NewWorkspaceDialogProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')

  // Create workspace mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateWorkspaceData) => workspacesApi.create(data),
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      toast.success('Workspace created!', {
        description: `"${workspace.name}" is ready to use`,
      })
      setOpen(false)
      resetForm()
      onCreated?.(workspace.id)
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error('Failed to create workspace', {
        description: error.response?.data?.detail || 'Please try again',
      })
    },
  })

  const resetForm = () => {
    setName('')
    setDescription('')
    setIcon('')
  }

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Please enter a workspace name')
      return
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <FolderPlus className="h-4 w-4" />
            New Workspace
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            Organize your chats into a new workspace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Project Alpha, Personal"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="workspace-desc">Description (optional)</Label>
            <Input
              id="workspace-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this workspace for?"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
