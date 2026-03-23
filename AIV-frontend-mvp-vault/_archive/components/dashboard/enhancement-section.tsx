'use client'

import * as React from 'react'
import { useState, useRef } from 'react'
import { cloneApi } from '@/lib/api/clone'
import { toast } from 'sonner'
import { 
  Upload, 
  Camera, 
  FileText, 
  X, 
  Loader2,
  CheckCircle2,
  ImagePlus,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface EnhancementSectionProps {
  cloneId: string
  onUpdate?: () => void
}

export function EnhancementSection({ cloneId, onUpdate }: EnhancementSectionProps) {
  // Photo upload state
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Knowledge upload state
  const [knowledgeFiles, setKnowledgeFiles] = useState<File[]>([])
  const [isUploadingKnowledge, setIsUploadingKnowledge] = useState(false)
  const knowledgeInputRef = useRef<HTMLInputElement>(null)

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate max 3 photos
    const totalPhotos = photos.length + files.length
    if (totalPhotos > 3) {
      toast.error('Maximum 3 photos allowed')
      return
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    const invalidFiles = files.filter(f => !validTypes.includes(f.type))
    if (invalidFiles.length > 0) {
      toast.error('Only JPEG, PNG, and WebP images are allowed')
      return
    }

    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file))
    
    setPhotos(prev => [...prev, ...files])
    setPhotoPreviewUrls(prev => [...prev, ...newPreviewUrls])
    
    // Reset input
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
  }

  // Remove photo
  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index])
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  // Upload photos
  const uploadPhotos = async () => {
    if (photos.length === 0) return

    setIsUploadingPhotos(true)
    try {
      const result = await cloneApi.enhancePhotos(cloneId, photos)
      toast.success('Photos uploaded!', {
        description: result.message || 'Avatar will be regenerated with your new photos.',
      })
      // Clear photos
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url))
      setPhotos([])
      setPhotoPreviewUrls([])
      onUpdate?.()
    } catch (error) {
      console.error('Photo upload error:', error)
      toast.error('Failed to upload photos', {
        description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Please try again.',
      })
    } finally {
      setIsUploadingPhotos(false)
    }
  }

  // Handle knowledge file selection
  const handleKnowledgeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate file types
    const validTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    const validExtensions = ['.pdf', '.txt', '.md', '.doc', '.docx']
    
    const invalidFiles = files.filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase()
      return !validTypes.includes(f.type) && !validExtensions.includes(ext)
    })
    
    if (invalidFiles.length > 0) {
      toast.error('Only PDF, TXT, MD, DOC, and DOCX files are allowed')
      return
    }

    // Validate max size (10MB each)
    const oversizedFiles = files.filter(f => f.size > 10 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      toast.error('Files must be under 10MB each')
      return
    }

    setKnowledgeFiles(prev => [...prev, ...files])
    
    // Reset input
    if (knowledgeInputRef.current) {
      knowledgeInputRef.current.value = ''
    }
  }

  // Remove knowledge file
  const removeKnowledgeFile = (index: number) => {
    setKnowledgeFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Upload knowledge files
  const uploadKnowledge = async () => {
    if (knowledgeFiles.length === 0) return

    setIsUploadingKnowledge(true)
    try {
      const result = await cloneApi.enhanceKnowledge(cloneId, knowledgeFiles)
      toast.success('Knowledge uploaded!', {
        description: `${result.files_uploaded} files added. Your clone is now smarter!`,
      })
      setKnowledgeFiles([])
      onUpdate?.()
    } catch (error) {
      console.error('Knowledge upload error:', error)
      toast.error('Failed to upload files', {
        description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Please try again.',
      })
    } finally {
      setIsUploadingKnowledge(false)
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Photo Enhancement Card */}
      <Card className="rounded-3xl shadow-sm border-0 bg-gradient-to-br from-purple-50 to-pink-50 ring-1 ring-purple-100">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Camera className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Enhance Avatar</CardTitle>
              <CardDescription>Add up to 3 photos for a better avatar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo previews */}
          {photoPreviewUrls.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photoPreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Photo ${index + 1}`}
                    className="h-20 w-20 rounded-lg object-cover ring-2 ring-white shadow-md"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < 3 && (
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="h-20 w-20 rounded-lg border-2 border-dashed border-purple-300 flex items-center justify-center text-purple-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
                >
                  <ImagePlus className="h-6 w-6" />
                </button>
              )}
            </div>
          )}

          {/* Upload button */}
          {photoPreviewUrls.length === 0 ? (
            <Button
              variant="outline"
              className="w-full h-24 border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-50/50"
              onClick={() => photoInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-5 w-5 text-purple-500" />
                <span className="text-sm">Click to upload photos</span>
                <span className="text-xs text-muted-foreground">JPEG, PNG, WebP</span>
              </div>
            </Button>
          ) : (
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={uploadPhotos}
              disabled={isUploadingPhotos}
            >
              {isUploadingPhotos ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Upload {photos.length} Photo{photos.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </CardContent>
      </Card>

      {/* Knowledge Enhancement Card */}
      <Card className="rounded-3xl shadow-sm border-0 bg-gradient-to-br from-blue-50 to-cyan-50 ring-1 ring-blue-100">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Add Knowledge</CardTitle>
              <CardDescription>Upload documents to make your clone smarter</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File list */}
          {knowledgeFiles.length > 0 && (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {knowledgeFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-white/70 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {formatFileSize(file.size)}
                  </Badge>
                  <button
                    onClick={() => removeKnowledgeFile(index)}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {knowledgeFiles.length === 0 ? (
            <Button
              variant="outline"
              className="w-full h-24 border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50/50"
              onClick={() => knowledgeInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-5 w-5 text-blue-500" />
                <span className="text-sm">Click to upload documents</span>
                <span className="text-xs text-muted-foreground">PDF, TXT, MD, DOC, DOCX</span>
              </div>
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => knowledgeInputRef.current?.click()}
              >
                Add More
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={uploadKnowledge}
                disabled={isUploadingKnowledge}
              >
                {isUploadingKnowledge ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          )}

          <input
            ref={knowledgeInputRef}
            type="file"
            accept=".pdf,.txt,.md,.doc,.docx,application/pdf,text/plain,text/markdown"
            multiple
            className="hidden"
            onChange={handleKnowledgeSelect}
          />
        </CardContent>
      </Card>
    </div>
  )
}
