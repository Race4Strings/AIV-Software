"use client"

import { motion } from "framer-motion"

interface FaceScannerProps {
  imageUrl?: string
  isScanning?: boolean
}

export function FaceScanner({ imageUrl, isScanning = true }: FaceScannerProps) {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80">
      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-dashed border-blue-400/40"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Middle rotating ring (opposite direction) */}
      <motion.div
        className="absolute inset-4 rounded-full border-2 border-dashed border-cyan-400/30"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Inner glow container */}
      <div className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-purple-500/10 backdrop-blur-sm">
        {/* Face silhouette or image */}
        <div className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center">
          {imageUrl ? (
            <motion.img
              src={imageUrl}
              alt="Your face"
              className="w-full h-full object-cover rounded-full"
              animate={{ 
                rotateY: [0, 15, 0, -15, 0],
                scale: [1, 1.02, 1, 1.02, 1]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : (
            <motion.div
              className="w-3/4 h-3/4"
              animate={{ 
                rotateY: [0, 15, 0, -15, 0],
                scale: [1, 1.02, 1, 1.02, 1]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Abstract face silhouette using SVG */}
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-600/60">
                <ellipse cx="50" cy="40" rx="30" ry="35" fill="currentColor" />
                <ellipse cx="50" cy="85" rx="25" ry="15" fill="currentColor" />
                <circle cx="38" cy="35" r="4" className="fill-slate-500/40" />
                <circle cx="62" cy="35" r="4" className="fill-slate-500/40" />
              </svg>
            </motion.div>
          )}
        </div>
        
        {/* Scanning line */}
        {isScanning && (
          <motion.div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_4px_rgba(34,211,238,0.5)]"
            animate={{ 
              top: ["10%", "90%", "10%"]
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
        )}
      </div>
      
      {/* Particle effects */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full"
          style={{
            left: "50%",
            top: "50%",
          }}
          animate={{
            x: [0, Math.cos((i * Math.PI * 2) / 8) * 150],
            y: [0, Math.sin((i * Math.PI * 2) / 8) * 150],
            opacity: [0.8, 0],
            scale: [1, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeOut",
          }}
        />
      ))}
      
      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-blue-400/60" />
      <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-blue-400/60" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-blue-400/60" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-blue-400/60" />
      
      {/* Pulsing center glow */}
      <motion.div
        className="absolute inset-16 rounded-full bg-cyan-400/20 blur-xl"
        animate={{ 
          opacity: [0.3, 0.6, 0.3],
          scale: [0.9, 1.1, 0.9]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  )
}
