'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useProducer } from '../producer-context'
import { toast } from 'sonner'
import { Mic, Square, Play, Pause, CheckCircle, Trash2 } from 'lucide-react'

interface StepProps {
  stepLabel: string
}

export function VoiceCaptureStep({ stepLabel }: StepProps) {
  const { setStep, saveVoiceData } = useProducer()
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error accessing microphone:', error)
      toast.error('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const deleteRecording = () => {
    setAudioUrl(null)
    setAudioBlob(null)
    setRecordingTime(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleNext = async () => {
    if (!audioBlob) {
      toast.error('Please record a voice sample')
      return
    }

    setIsSaving(true)
    try {
      // Upload to S3-compatible storage
      const { uploadApi } = await import('@/lib/api')
      const uploadResult = await uploadApi.uploadVoice(audioBlob)
      
      // Save the S3 URL to clone
      await saveVoiceData({ sampleUrl: uploadResult.url, duration: recordingTime })
      toast.success('Voice sample uploaded!')
      setStep('personality')
    } catch (error) {
      console.error(error)
      toast.error('Failed to upload voice sample')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">{stepLabel}: Capture Your Voice</h2>
        <p className="text-muted-foreground">
          Record at least 15 seconds of natural speech. Read aloud or speak freely about any topic.
        </p>
      </div>

      {/* Recording UI */}
      <div className="flex flex-col items-center space-y-6 w-full max-w-md">
        {/* Microphone Button */}
        <div 
          className={`relative w-32 h-32 rounded-full flex items-center justify-center cursor-pointer transition-all ${
            isRecording 
              ? 'bg-red-500 animate-pulse' 
              : audioUrl 
                ? 'bg-green-500' 
                : 'bg-primary hover:bg-primary/90'
          }`}
          onClick={isRecording ? stopRecording : !audioUrl ? startRecording : undefined}
        >
          {isRecording ? (
            <Square className="w-12 h-12 text-white" />
          ) : audioUrl ? (
            <CheckCircle className="w-12 h-12 text-white" />
          ) : (
            <Mic className="w-12 h-12 text-white" />
          )}
          
          {isRecording && (
            <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping" />
          )}
        </div>

        {/* Recording Time */}
        {isRecording && (
          <div className="text-2xl font-mono text-red-500">
            {formatTime(recordingTime)}
          </div>
        )}

        {/* Playback Controls */}
        {audioUrl && !isRecording && (
          <div className="flex items-center gap-4">
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <Button variant="outline" size="lg" onClick={togglePlayback}>
              {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button variant="destructive" size="lg" onClick={deleteRecording}>
              <Trash2 className="w-5 h-5 mr-2" />
              Re-record
            </Button>
          </div>
        )}

        {/* Status Text */}
        <p className="text-sm text-muted-foreground">
          {isRecording 
            ? 'Recording... Click the button to stop' 
            : audioUrl 
              ? `Recording saved (${formatTime(recordingTime)})` 
              : 'Click the microphone to start recording'}
        </p>
      </div>

      {/* Next Button */}
      <div className="flex justify-center pt-8">
        <Button 
          size="lg" 
          onClick={handleNext} 
          disabled={isSaving || !audioUrl}
        >
          {isSaving ? 'Uploading...' : 'Voice Captured: Next Step'}
        </Button>
      </div>
    </div>
  )
}
