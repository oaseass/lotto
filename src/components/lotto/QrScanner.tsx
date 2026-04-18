'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  class BarcodeDetector {
    constructor(options?: { formats: string[] })
    detect(image: ImageBitmap | Blob): Promise<Array<{ rawValue: string }>>
  }
}

interface QrScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const retryTimerRef = useRef<number | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(true)
  const [fileProcessing, setFileProcessing] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')
  const [needsManualStart, setNeedsManualStart] = useState(false)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    void startCamera(false)
    return () => stopCamera()
  }, [])

  const startCamera = async (fromUserGesture = true) => {
    const videoElement = videoRef.current

    if (!videoElement) {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current)
      }
      retryTimerRef.current = window.setTimeout(() => {
        void startCamera(fromUserGesture)
      }, 250)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setDebugInfo('이 기기에서 카메라를 사용할 수 없습니다.')
      setHasCamera(false)
      return
    }

    try {
      doneRef.current = false
      setHasCamera(true)
      setNeedsManualStart(false)
      setDebugInfo(fromUserGesture ? '카메라를 여는 중입니다...' : '카메라 준비 중입니다...')
      stopCamera(false)

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }

      streamRef.current = stream
      videoElement.srcObject = stream
      videoElement.muted = true
      videoElement.playsInline = true
      videoElement.autoplay = true

      await waitForVideoReady(videoElement)

      try {
        await videoElement.play()
      } catch {
        setNeedsManualStart(true)
        setDebugInfo('화면을 한 번 눌러 카메라를 시작해주세요.')
        return
      }

      const liveTrack = stream.getVideoTracks().find(track => track.readyState === 'live')
      if (!liveTrack) {
        throw new Error('카메라 영상이 시작되지 않았습니다.')
      }

      const { BrowserQRCodeReader } = await import('@zxing/browser')
      const reader = new BrowserQRCodeReader()
      const controls = await reader.decodeFromVideoElement(
        videoElement,
        (result, _err) => {
          if (result && !doneRef.current) {
            doneRef.current = true
            stopCamera()
            onScan(result.getText())
          }
        }
      )
      controlsRef.current = controls
      setIsScanning(true)
      setDebugInfo('')
    } catch (e) {
      const message = getCameraErrorMessage(e)
      setDebugInfo(message)
      setHasCamera(false)
      onError?.(message)
    }
  }

  const stopCamera = (resetMessage = false) => {
    controlsRef.current?.stop()
    controlsRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }
    if (resetMessage) {
      setDebugInfo('')
      setNeedsManualStart(false)
    }
    setIsScanning(false)
  }

  function getCameraErrorMessage(error: unknown): string {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') return '카메라 권한이 꺼져 있습니다. 브라우저나 앱 설정에서 카메라를 허용한 뒤 다시 시도해주세요.'
      if (error.name === 'NotReadableError') return '다른 앱이 카메라를 사용 중입니다. 카메라 앱을 종료하고 다시 시도해주세요.'
      if (error.name === 'NotFoundError') return '사용 가능한 카메라를 찾지 못했습니다.'
      if (error.name === 'AbortError') return '카메라 시작이 중단되었습니다. 다시 시도해주세요.'
      return `카메라 오류: ${error.name}`
    }

    if (error instanceof Error) return error.message
    return '카메라를 시작하지 못했습니다.'
  }

  function waitForVideoReady(videoElement: HTMLVideoElement) {
    if (videoElement.readyState >= 2) {
      return Promise.resolve()
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup()
        reject(new Error('카메라 화면을 불러오지 못했습니다.'))
      }, 4000)

      const cleanup = () => {
        window.clearTimeout(timeout)
        videoElement.removeEventListener('loadedmetadata', onReady)
        videoElement.removeEventListener('canplay', onReady)
        videoElement.removeEventListener('error', onErrorEvent)
      }

      const onReady = () => {
        cleanup()
        resolve()
      }

      const onErrorEvent = () => {
        cleanup()
        reject(new Error('카메라 영상 준비 중 오류가 발생했습니다.'))
      }

      videoElement.addEventListener('loadedmetadata', onReady, { once: true })
      videoElement.addEventListener('canplay', onReady, { once: true })
      videoElement.addEventListener('error', onErrorEvent, { once: true })
    })
  }

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setFileProcessing(true)
    try {
      // BarcodeDetector로 파일 인식 시도
      if ('BarcodeDetector' in window) {
        try {
          const detector = new BarcodeDetector({ formats: ['qr_code'] })
          const bitmap = await createImageBitmap(file)
          const results = await detector.detect(bitmap)
          bitmap.close()
          if (results?.[0]?.rawValue) { onScan(results[0].rawValue); return }
        } catch { /* fallthrough */ }
      }
      // ZXing으로 파일 인식
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      const reader = new BrowserQRCodeReader()
      const url = URL.createObjectURL(file)
      try {
        const result = await reader.decodeFromImageUrl(url)
        URL.revokeObjectURL(url)
        onScan(result.getText())
      } catch {
        URL.revokeObjectURL(url)
        onError?.('QR 코드를 인식하지 못했습니다. QR 코드를 화면 가득 채워서 찍어주세요.')
      }
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
        {debugInfo && <p style={{ fontSize: 11, color: '#e55', marginBottom: 8 }}>{debugInfo}</p>}
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
        <button onClick={() => { setHasCamera(true); void startCamera(true) }}
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
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', background: '#000' }}
        />

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

        {needsManualStart && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}>
            <button
              onClick={() => void startCamera(true)}
              style={{
                height: 42,
                padding: '0 16px',
                borderRadius: 999,
                border: 'none',
                background: '#f5c842',
                color: '#222',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              카메라 켜기
            </button>
          </div>
        )}

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
