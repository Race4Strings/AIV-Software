'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useProducer } from '../producer-context'
import { toast } from 'sonner'
import { Camera, Image as ImageIcon, Upload, X, ArrowLeft } from 'lucide-react'

interface StepProps {
  stepLabel: string
}

export function VisualStep({ stepLabel }: StepProps) {
  const { setStep, saveImageData, imageData } = useProducer()
  const [images, setImages] = useState<{
    frontal: { url: string | null; file: File | null }
    profile: { url: string | null; file: File | null }
    body: { url: string | null; file: File | null }
  }>({
    frontal: { url: imageData.frontal, file: null },
    profile: { url: imageData.profile, file: null },
    body: { url: imageData.body, file: null },
  })
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)

  const fileInputRefs = {
    frontal: useRef<HTMLInputElement>(null),
    profile: useRef<HTMLInputElement>(null),
    body: useRef<HTMLInputElement>(null),
  }

  const handleFileSelect = async (type: keyof typeof images, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    setUploadingSlot(type)

    try {
      // Upload to S3-compatible storage
      const { uploadApi } = await import('@/lib/api')
      const uploadResult = await uploadApi.uploadImage(file)
      
      setImages(prev => ({ 
        ...prev, 
        [type]: { url: uploadResult.url, file } 
      }))
      toast.success(`${type} image uploaded!`)
    } catch (error) {
      console.error(error)
      toast.error('Failed to upload image')
    } finally {
      setUploadingSlot(null)
    }
  }

  const handleRemoveImage = (type: keyof typeof images) => {
    setImages(prev => ({ ...prev, [type]: { url: null, file: null } }))
  }

  const handleNext = async () => {
    if (!images.frontal.url) {
      toast.error('Please upload at least a frontal portrait')
      return
    }

    setIsSaving(true)
    try {
      // URLs are already S3 URLs from upload
      await saveImageData({
        frontal: images.frontal.url,
        profile: images.profile.url,
        body: images.body.url,
      })
      setStep('rights')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save images')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    setStep('knowledge')
  }

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">{stepLabel}: Capture Your Image</h2>
        <p className="text-muted-foreground">
          Upload clear photos for the most accurate visual representation of your clone.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <ImageSlot 
          title="Frontal Portrait" 
          desc="Natural expression, direct to camera." 
          icon={<Camera className="w-8 h-8"/>}
          imageUrl={images.frontal.url}
          isUploading={uploadingSlot === 'frontal'}
          onUpload={() => fileInputRefs.frontal.current?.click()}
          onRemove={() => handleRemoveImage('frontal')}
          required
        />
        <input
          ref={fileInputRefs.frontal}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect('frontal', e)}
        />

        <ImageSlot 
          title="Profile Angle" 
          desc="Clear view of facial structure." 
          icon={<ImageIcon className="w-8 h-8"/>}
          imageUrl={images.profile.url}
          isUploading={uploadingSlot === 'profile'}
          onUpload={() => fileInputRefs.profile.current?.click()}
          onRemove={() => handleRemoveImage('profile')}
        />
        <input
          ref={fileInputRefs.profile}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect('profile', e)}
        />

        <ImageSlot 
          title="Full Body (Optional)" 
          desc="A natural, characteristic posture." 
          icon={<Upload className="w-8 h-8"/>}
          imageUrl={images.body.url}
          isUploading={uploadingSlot === 'body'}
          onUpload={() => fileInputRefs.body.current?.click()}
          onRemove={() => handleRemoveImage('body')}
        />
        <input
          ref={fileInputRefs.body}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect('body', e)}
        />
      </div>

      <div className="flex justify-between w-full pt-8">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        
        <Button 
          size="lg" 
          onClick={handleNext} 
          disabled={isSaving || !images.frontal.url}
        >
          {isSaving ? 'Saving...' : 'Images Added: Next Step'}
        </Button>
      </div>
    </div>
  )
}

function ImageSlot({ 
  title, 
  desc, 
  icon, 
  imageUrl, 
  isUploading,
  onUpload, 
  onRemove,
  required = false
}: { 
  title: string
  desc: string
  icon: React.ReactNode
  imageUrl: string | null
  isUploading: boolean
  onUpload: () => void
  onRemove: () => void
  required?: boolean
}) {
  return (
    <div 
      className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center text-center space-y-4 transition-colors cursor-pointer hover:bg-muted/50 ${imageUrl ? 'border-green-500 bg-green-500/5' : 'border-border'}`}
      onClick={!imageUrl ? onUpload : undefined}
    >
      {isUploading ? (
        <div className="p-4 rounded-full bg-muted animate-pulse">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : imageUrl ? (
        <>
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-green-500">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-2 right-2 p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <div className="p-4 rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
        {required && !imageUrl && <p className="text-xs text-red-500 mt-1">Required</p>}
      </div>

      {imageUrl && <p className="text-sm font-medium text-green-600">Uploaded ✓</p>}
    </div>
  )
}
