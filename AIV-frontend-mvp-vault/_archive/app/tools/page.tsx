'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function ToolsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Preserve the query params and redirect to home
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    
    // Build redirect URL with params
    let redirectUrl = '/'
    const params = new URLSearchParams()
    
    if (connected) {
      params.set('connected', connected)
    }
    if (error) {
      params.set('error', error)
    }
    
    if (params.toString()) {
      redirectUrl += '?' + params.toString()
    }
    
    router.replace(redirectUrl)
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Connecting tool...</p>
      </div>
    </div>
  )
}

export default function ToolsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <ToolsContent />
    </Suspense>
  )
}
