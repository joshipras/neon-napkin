import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { CameraState } from '../types/music'

export function useCameraFeed() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraState, setCameraState] = useState<CameraState>({
    status: 'idle',
    message: 'Tap start to unlock the selfie camera.',
  })

  const stopCamera = useEffectEvent(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  })

  const startCamera = useEffectEvent(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState({
        status: 'error',
        message: 'This browser does not support camera access.',
      })
      return
    }

    setCameraState({
      status: 'requesting',
      message: 'Requesting front-camera access.',
    })

    try {
      stopCamera()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameraState({
        status: 'live',
        message: 'Camera is live. Tracking zones are ready for MediaPipe wiring.',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Camera access failed.'

      setCameraState({
        status: 'error',
        message,
      })
    }
  })

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return {
    cameraState,
    startCamera,
    videoRef,
  }
}
