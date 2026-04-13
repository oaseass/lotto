'use client'

import { useEffect, useRef, useState } from 'react'

interface QrScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(true)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>()

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setIsScanning(true)
        scanFrame()
      }
    } catch {
      setHasCamera(false)
      onError?.('카메라에 접근할 수 없습니다')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setIsScanning(false)
  }

  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    try {
      const { default: jsQR } = await import('jsqr')
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code?.data) {
        stopCamera()
        onScan(code.data)
        return
      }
    } catch {}

    animFrameRef.current = requestAnimationFrame(scanFrame)
  }

  if (!hasCamera) {
    return (
      <div style={{
        padding: '32px 20px', textAlign: 'center',
        background: 'var(--bg-card)', border: '1px solid var(--line)',
        borderRadius: 18,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5"
          style={{ display: 'block', margin: '0 auto 12px' }}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 4 }}>카메라를 사용할 수 없습니다</p>
        <p style={{ fontSize: 12, color: 'var(--t3)' }}>기기의 카메라 권한을 확인해주세요</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#000' }}>
      <video
        ref={videoRef}
        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
        playsInline
        muted
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* 스캔 가이드 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ position: 'relative', width: '65%', aspectRatio: '1' }}>
          {/* 코너 마커 4개 */}
          {[
            { top: 0, left: 0, borderRight: 'none', borderBottom: 'none' },
            { top: 0, right: 0, borderLeft: 'none', borderBottom: 'none' },
            { bottom: 0, left: 0, borderRight: 'none', borderTop: 'none' },
            { bottom: 0, right: 0, borderLeft: 'none', borderTop: 'none' },
          ].map((style, i) => (
            <div key={i} style={{
              position: 'absolute', width: 28, height: 28,
              border: '2.5px solid var(--amber)',
              ...style,
            }} />
          ))}
          {/* 스캔 라인 */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '50%',
            height: 2, background: 'var(--amber)',
            boxShadow: '0 0 10px rgba(212,168,67,0.8)',
            animation: 'scanLine 2s ease-in-out infinite',
          }} />
        </div>
      </div>

      {isScanning && (
        <div style={{
          position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center',
        }}>
          <span style={{
            fontSize: 12, color: 'var(--amber)', fontWeight: 600,
            background: 'rgba(0,0,0,0.65)', padding: '5px 14px', borderRadius: 100,
          }}>
            로또 용지의 QR코드를 비춰주세요
          </span>
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0%, 100% { transform: translateY(-50px); opacity: 0.4; }
          50% { transform: translateY(50px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
