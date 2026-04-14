'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  class BarcodeDetector {
    constructor(options?: { formats: string[] })
    detect(image: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<Array<{ rawValue: string }>>
    static getSupportedFormats(): Promise<string[]>
  }
}

interface QrScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(true)
  const [fileProcessing, setFileProcessing] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')
  const scanCountRef = useRef(0)
  const scanningRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const detectorRef = useRef<BarcodeDetector | null>(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const initDetector = () => {
    if (!('BarcodeDetector' in window)) {
      setDebugInfo('BD:없음 jsQR사용')
      return
    }
    try {
      // getSupportedFormats() 없이 바로 생성 — Samsung Chrome 호환
      detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] })
      setDebugInfo('BD:초기화완료(qr)')
    } catch {
      try {
        detectorRef.current = new BarcodeDetector() // 포맷 제한 없이
        setDebugInfo('BD:초기화완료(all)')
      } catch {
        setDebugInfo('BD:초기화실패')
      }
    }
  }

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('not supported')
      initDetector()
      scanCountRef.current = 0
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      scanningRef.current = true
      setIsScanning(true)
      scheduleScan()
    } catch {
      setHasCamera(false)
    }
  }

  const stopCamera = () => {
    scanningRef.current = false
    clearTimeout(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setIsScanning(false)
  }

  const scheduleScan = () => {
    timerRef.current = setTimeout(scanFrame, detectorRef.current ? 80 : 200)
  }

  const scanFrame = async () => {
    if (!scanningRef.current) return
    const video = videoRef.current
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      scheduleScan(); return
    }

    scanCountRef.current++
    if (scanCountRef.current % 5 === 0) {
      setDebugInfo(prev => prev.replace(/\s스캔\d+/g, '') + ` 스캔${scanCountRef.current}`)
    }

    try {
      if (detectorRef.current) {
        // canvas → ImageBitmap 방식 (가장 호환성 높음)
        const canvas = canvasRef.current!
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')!.drawImage(video, 0, 0)
        const bitmap = await createImageBitmap(canvas)
        let results: Array<{ rawValue: string }> = []
        try {
          results = await detectorRef.current.detect(bitmap)
        } catch (e) {
          setDebugInfo(prev => `BD오류:${String(e).slice(0, 30)}`)
        } finally {
          bitmap.close()
        }

        if (results?.[0]?.rawValue) {
          stopCamera()
          onScan(results[0].rawValue)
          return
        }
      } else {
        // jsQR 폴백
        const canvas = canvasRef.current!
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0)
        const { default: jsQR } = await import('jsqr')
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, canvas.width, canvas.height, {
          inversionAttempts: 'dontInvert',
        })
        if (code?.data) { stopCamera(); onScan(code.data); return }
      }
    } catch {}

    scheduleScan()
  }

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setFileProcessing(true)
    try {
      if (detectorRef.current || 'BarcodeDetector' in window) {
        const detector = detectorRef.current ?? (() => {
          try { return new BarcodeDetector({ formats: ['qr_code'] }) } catch { return new BarcodeDetector() }
        })()
        const bitmap = await createImageBitmap(file)
        const results = await detector.detect(bitmap)
        bitmap.close()
        if (results?.[0]?.rawValue) { stopCamera(); onScan(results[0].rawValue); return }
      } else {
        const { default: jsQR } = await import('jsqr')
        for (const maxW of [4096, 1280, 800]) {
          const bitmap = await createImageBitmap(file, { resizeWidth: Math.min(maxW, (await createImageBitmap(file)).width) })
          const cv = document.createElement('canvas')
          cv.width = bitmap.width; cv.height = bitmap.height
          const ctx = cv.getContext('2d')!
          ctx.drawImage(bitmap, 0, 0)
          const code = jsQR(ctx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, { inversionAttempts: 'attemptBoth' })
          bitmap.close()
          if (code?.data) { stopCamera(); onScan(code.data); return }
        }
      }
      onError?.('QR 코드를 인식하지 못했습니다. QR 코드를 화면 가득 채워서 찍어주세요.')
    } catch {
      onError?.('이미지를 처리할 수 없습니다.')
    } finally {
      setFileProcessing(false)
    }
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
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
          onChange={handleFileCapture} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current?.click()} disabled={fileProcessing}
          style={{
            width: '100%', height: 44, background: fileProcessing ? '#ccc' : '#007bc3',
            color: '#fff', fontSize: 13, fontWeight: 700,
            border: 'none', borderRadius: 8, cursor: 'pointer', marginBottom: 8,
          }}>
          {fileProcessing ? '인식 중...' : '📷 카메라로 QR 찍기'}
        </button>
        <button onClick={() => { setHasCamera(true); startCamera() }}
          style={{
            width: '100%', height: 36, background: '#fff', color: '#555',
            fontSize: 12, border: '1px solid #dcdcdc', borderRadius: 8, cursor: 'pointer',
          }}>
          카메라 권한 허용 후 다시 시도
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#000' }}>
        <video ref={videoRef}
          style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
          playsInline muted />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ position: 'relative', width: '65%', aspectRatio: '1' }}>
            {([
              { top: 0, left: 0, borderRight: 'none', borderBottom: 'none' },
              { top: 0, right: 0, borderLeft: 'none', borderBottom: 'none' },
              { bottom: 0, left: 0, borderRight: 'none', borderTop: 'none' },
              { bottom: 0, right: 0, borderLeft: 'none', borderTop: 'none' },
            ] as React.CSSProperties[]).map((s, i) => (
              <div key={i} style={{ position: 'absolute', width: 28, height: 28, border: '2.5px solid var(--amber)', ...s }} />
            ))}
            <div style={{
              position: 'absolute', left: 0, right: 0, top: '50%',
              height: 2, background: 'var(--amber)',
              boxShadow: '0 0 10px rgba(212,168,67,0.8)',
              animation: 'scanLine 2s ease-in-out infinite',
            }} />
          </div>
        </div>

        {isScanning && (
          <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{
              fontSize: 12, color: 'var(--amber)', fontWeight: 600,
              background: 'rgba(0,0,0,0.65)', padding: '5px 14px', borderRadius: 100,
            }}>
              로또 용지의 QR코드를 비춰주세요
            </span>
          </div>
        )}
        {debugInfo && (
          <div style={{ position: 'absolute', top: 8, left: 8, right: 8 }}>
            <span style={{ fontSize: 10, color: '#0f0', background: 'rgba(0,0,0,0.8)', padding: '3px 8px', borderRadius: 4 }}>
              {debugInfo}
            </span>
          </div>
        )}
        <style>{`@keyframes scanLine{0%,100%{transform:translateY(-50px);opacity:.4}50%{transform:translateY(50px);opacity:1}}`}</style>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
        onChange={handleFileCapture} style={{ display: 'none' }} />
      <button onClick={() => fileInputRef.current?.click()} disabled={fileProcessing}
        style={{
          width: '100%', height: 40, marginTop: 10,
          background: fileProcessing ? '#ccc' : '#f5f5f5',
          color: '#555', fontSize: 12,
          border: '1px solid #dcdcdc', borderRadius: 8, cursor: 'pointer',
        }}>
        {fileProcessing ? '인식 중...' : '📷 카메라가 안될 때: 사진 찍어서 QR 읽기'}
      </button>
    </div>
  )
}
