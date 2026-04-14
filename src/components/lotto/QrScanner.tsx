'use client'

import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

interface QrScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
}

// 이미지를 최대 width로 리사이즈 (큰 사진 처리 속도 개선)
function resizeImageData(bitmap: ImageBitmap, maxWidth: number): ImageData {
  const scale = Math.min(1, maxWidth / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(true)
  const [fileProcessing, setFileProcessing] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const scanningRef = useRef(false)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('not supported')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setIsScanning(true)
        scanningRef.current = true
        scheduleScan()
      }
    } catch {
      setHasCamera(false)
    }
  }

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setFileProcessing(true)
    try {
      const bitmap = await createImageBitmap(file)
      // 원본 크기로 먼저 시도, 실패 시 리사이즈 후 재시도
      for (const maxW of [bitmap.width, 1280, 800]) {
        const imageData = resizeImageData(bitmap, maxW)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        })
        if (code?.data) {
          stopCamera()
          onScan(code.data)
          return
        }
      }
      onError?.('QR 코드를 인식하지 못했습니다. QR 코드를 화면 가득 채워서 다시 찍어주세요.')
    } catch {
      onError?.('이미지를 처리할 수 없습니다.')
    } finally {
      setFileProcessing(false)
    }
  }

  const stopCamera = () => {
    scanningRef.current = false
    streamRef.current?.getTracks().forEach(t => t.stop())
    clearTimeout(timerRef.current)
    setIsScanning(false)
  }

  const scheduleScan = () => {
    timerRef.current = setTimeout(scanFrame, 200)
  }

  const scanFrame = () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      scheduleScan()
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })
      if (code?.data) {
        stopCamera()
        onScan(code.data)
        return
      }
    } catch {}

    scheduleScan()
  }

  if (!hasCamera) {
    return (
      <div style={{
        padding: '28px 20px', textAlign: 'center',
        background: '#fff', border: '1px solid #dcdcdc', borderRadius: 12,
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"
          style={{ display: 'block', margin: '0 auto 12px' }}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 4 }}>카메라를 사용할 수 없습니다</p>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
          설정 &gt; Chrome &gt; 카메라 권한을 허용하거나<br/>아래 버튼으로 사진을 찍어 QR을 읽어보세요
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileCapture}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={fileProcessing}
          style={{
            width: '100%', height: 44,
            background: fileProcessing ? '#ccc' : '#007bc3',
            color: '#fff', fontSize: 13, fontWeight: 700,
            border: 'none', borderRadius: 8, cursor: 'pointer',
            marginBottom: 8,
          }}
        >
          {fileProcessing ? '인식 중...' : '📷 카메라로 QR 찍기'}
        </button>
        <button
          onClick={() => { setHasCamera(true); startCamera() }}
          style={{
            width: '100%', height: 36,
            background: '#fff', color: '#555',
            fontSize: 12, border: '1px solid #dcdcdc',
            borderRadius: 8, cursor: 'pointer',
          }}
        >
          카메라 권한 허용 후 다시 시도
        </button>
      </div>
    )
  }

  return (
    <div>
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

      {/* 파일 촬영 fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileCapture}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={fileProcessing}
        style={{
          width: '100%', height: 40, marginTop: 10,
          background: fileProcessing ? '#ccc' : '#f5f5f5',
          color: '#555', fontSize: 12,
          border: '1px solid #dcdcdc', borderRadius: 8, cursor: 'pointer',
        }}
      >
        {fileProcessing ? '인식 중...' : '📷 카메라가 안될 때: 사진 찍어서 QR 읽기'}
      </button>
    </div>
  )
}
