'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useProducer } from '../producer-context'
import { toast } from 'sonner'
import { FileText, Upload, X, ArrowLeft } from 'lucide-react'

interface StepProps {
  stepLabel: string
}

export function KnowledgeStep({ stepLabel }: StepProps) {
  const { setStep, saveKnowledgeFiles, knowledgeFiles } = useProducer()
  const [files, setFiles] = useState<Array<{ name: string; url: string; size: number }>>(knowledgeFiles)
  const [, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles) return

    setIsUploading(true)
    
    try {
      const { uploadApi } = await import('@/lib/api')
      const newFiles: Array<{ name: string; url: string; size: number }> = []
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        // Check file type
        const validTypes = ['.pdf', '.doc', '.docx', '.txt', '.md']
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        if (!validTypes.includes(ext)) {
          toast.error(`Invalid file type: ${file.name}`)
          continue
        }
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File too large: ${file.name}`)
          continue
        }
        
        // Upload to S3-compatible storage
        const uploadResult = await uploadApi.uploadDocument(file)
        newFiles.push({ name: file.name, url: uploadResult.url, size: file.size })
      }
      
      setFiles(prev => [...prev, ...newFiles])
      toast.success(`${newFiles.length} file(s) uploaded!`)
    } catch (error) {
      console.error(error)
      toast.error('Failed to upload files')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleNext = async () => {
    setIsSaving(true)
    try {
      await saveKnowledgeFiles(files)
      setStep('visual')
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    setStep('personality')
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">{stepLabel}: Upload Knowledge Base</h2>
        <p className="text-muted-foreground">
          Upload documents that represent your expertise, writings, or any knowledge you want your clone to have.
        </p>
      </div>

      {/* Upload Area */}
      <div 
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="font-medium">Click to upload or drag and drop</p>
        <p className="text-sm text-muted-foreground mt-1">PDF, DOC, DOCX, TXT, MD (max 10MB each)</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Uploaded Files ({files.length})</h3>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemoveFile(index)}
                className="p-1 rounded-full hover:bg-red-100 text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        
        <Button size="lg" onClick={handleNext} disabled={isSaving}>
          {isSaving ? 'Saving...' : files.length > 0 ? 'Files Added: Next Step' : 'Skip for Now'}
        </Button>
      </div>
    </div>
  )
}
