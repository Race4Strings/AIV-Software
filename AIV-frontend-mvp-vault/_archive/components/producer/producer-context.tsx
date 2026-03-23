'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { cloneApi } from '@/lib/api'
import { toast } from 'sonner'

type Step = 'intro' | 'voice' | 'personality' | 'knowledge' | 'visual' | 'rights' | 'activate'

interface ProducerContextType {
  step: Step
  setStep: (step: Step) => void
  cloneId: string | null
  setCloneId: (id: string) => void
  isLoading: boolean
  createDraft: () => Promise<void>
  voiceData: { sampleUrl: string | null; duration: number }
  setVoiceData: (data: { sampleUrl: string; duration: number }) => void
  saveVoiceData: (data: { sampleUrl: string; duration: number }) => Promise<void>
  personalityData: Record<string, string>
  setPersonalityData: (data: Record<string, string>) => void
  savePersonalityData: (data: Record<string, string>) => Promise<void>
  knowledgeFiles: Array<{ name: string; url: string; size: number }>
  setKnowledgeFiles: (files: Array<{ name: string; url: string; size: number }>) => void
  saveKnowledgeFiles: (files: Array<{ name: string; url: string; size: number }>) => Promise<void>
  imageData: { frontal: string | null; profile: string | null; body: string | null }
  setImageData: (data: { frontal: string | null; profile: string | null; body: string | null }) => void
  saveImageData: (data: { frontal: string | null; profile: string | null; body: string | null }) => Promise<void>
  rightsData: { isPublic: boolean; allowTraining: boolean }
  setRightsData: (data: { isPublic: boolean; allowTraining: boolean }) => void
  saveRightsData: (data: { isPublic: boolean; allowTraining: boolean }) => Promise<void>
  activate: () => Promise<void>
}

const ProducerContext = createContext<ProducerContextType | null>(null)

export function ProducerProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<Step>('intro')
  const [cloneId, setCloneId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [voiceData, setVoiceData] = useState<{ sampleUrl: string | null; duration: number }>({ sampleUrl: null, duration: 0 })
  const [personalityData, setPersonalityData] = useState<Record<string, string>>({})
  const [knowledgeFiles, setKnowledgeFiles] = useState<Array<{ name: string; url: string; size: number }>>([])
  const [imageData, setImageData] = useState<{ frontal: string | null; profile: string | null; body: string | null }>({ frontal: null, profile: null, body: null })
  const [rightsData, setRightsData] = useState<{ isPublic: boolean; allowTraining: boolean }>({ isPublic: false, allowTraining: false })

  // Check for existing clone on mount
  useEffect(() => {
    const checkExistingClone = async () => {
      try {
        const status = await cloneApi.getStatus()
        if (status.has_clone && status.clone_id) {
          setCloneId(status.clone_id)
          // Determine which step to resume from
          if (status.activated || status.is_portal_complete) {
            // Already complete, redirect to dashboard
            window.location.href = '/'
          } else if (status.visual_complete) {
            setStep('rights')
          } else if (status.knowledge_complete) {
            setStep('visual')
          } else if (status.personality_complete) {
            setStep('knowledge')
          } else if (status.voice_complete) {
            setStep('personality')
          } else {
            setStep('voice')
          }
        }
      } catch {
        // No clone exists, start fresh
        console.log('No existing clone found')
      }
    }
    checkExistingClone()
  }, [])

  const createDraft = useCallback(async () => {
    setIsLoading(true)
    try {
      // Get user name from localStorage with multiple fallbacks
      let userName = 'My'
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          // Try different possible field names
          userName = user.name || user.username || user.email?.split('@')[0] || 'My'
        }
      } catch (e) {
        console.warn('Could not parse user from localStorage:', e)
      }
      
      const clone = await cloneApi.create({
        name: `${userName}'s Clone`,
        description: 'Digital clone created via portal',
      })
      setCloneId(clone.id)
      setStep('voice')
      toast.success('Clone initialized!')
    } catch (error) {
      // If clone already exists, get the existing one
      if ((error as { response?: { status?: number } })?.response?.status === 400) {
        try {
          const status = await cloneApi.getStatus()
          if (status.clone_id) {
            setCloneId(status.clone_id)
            setStep('voice')
            return
          }
        } catch {
          // Ignore
        }
      }
      toast.error('Failed to initialize clone')
    } finally {
      setIsLoading(false)
    }
  }, [])


  const saveVoiceData = useCallback(async (data: { sampleUrl: string; duration: number }) => {
    if (!cloneId) return
    setIsLoading(true)
    try {
      await cloneApi.updateVoice(cloneId, {
        sample_url: data.sampleUrl,
        duration: data.duration,
      })
      setVoiceData(data)
    } catch (error) {
      toast.error('Failed to save voice data')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [cloneId])

  const savePersonalityData = useCallback(async (data: Record<string, string>) => {
    if (!cloneId) return
    setIsLoading(true)
    try {
      await cloneApi.updatePersonality(cloneId, data)
      setPersonalityData(data)
    } catch (error) {
      toast.error('Failed to save personality data')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [cloneId])

  const saveKnowledgeFiles = useCallback(async (files: Array<{ name: string; url: string; size: number }>) => {
    if (!cloneId) return
    setIsLoading(true)
    try {
      await cloneApi.updateKnowledge(cloneId, files)
      setKnowledgeFiles(files)
    } catch (error) {
      toast.error('Failed to save knowledge files')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [cloneId])

  const saveImageData = useCallback(async (data: { frontal: string | null; profile: string | null; body: string | null }) => {
    if (!cloneId) return
    setIsLoading(true)
    try {
      await cloneApi.updateVisual(cloneId, data)
      setImageData(data)
    } catch (error) {
      toast.error('Failed to save image data')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [cloneId])

  const saveRightsData = useCallback(async (data: { isPublic: boolean; allowTraining: boolean }) => {
    if (!cloneId) return
    setIsLoading(true)
    try {
      await cloneApi.updateRights(cloneId, {
        is_public: data.isPublic,
        allow_training: data.allowTraining,
      })
      setRightsData(data)
    } catch (error) {
      toast.error('Failed to save privacy settings')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [cloneId])

  const activate = useCallback(async () => {
    if (!cloneId) return
    setIsLoading(true)
    try {
      const result = await cloneApi.activate(cloneId)
      toast.success(result.message)
      
      // Update user localStorage to indicate clone is processing
      const user = localStorage.getItem('user')
      if (user) {
        const userData = JSON.parse(user)
        userData.cloneProcessing = true
        userData.cloneId = cloneId
        localStorage.setItem('user', JSON.stringify(userData))
      }
      
      // Redirect to dashboard immediately
      window.location.href = '/'
    } catch (error) {
      toast.error((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to activate clone')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [cloneId])

  return (
    <ProducerContext.Provider value={{
      step,
      setStep,
      cloneId,
      setCloneId,
      isLoading,
      createDraft,
      voiceData,
      setVoiceData,
      saveVoiceData,
      personalityData,
      setPersonalityData,
      savePersonalityData,
      knowledgeFiles,
      setKnowledgeFiles,
      saveKnowledgeFiles,
      imageData,
      setImageData,
      saveImageData,
      rightsData,
      setRightsData,
      saveRightsData,
      activate,
    }}>
      {children}
    </ProducerContext.Provider>
  )
}

export function useProducer() {
  const context = useContext(ProducerContext)
  if (!context) {
    throw new Error('useProducer must be used within ProducerProvider')
  }
  return context
}
