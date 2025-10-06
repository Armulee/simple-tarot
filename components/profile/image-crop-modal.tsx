"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RotateCw, X, Check } from "lucide-react"

interface ImageCropModalProps {
  isOpen: boolean
  onClose: () => void
  onCropComplete: (croppedImageBlob: Blob) => void
  imageFile: File | null
}

export function ImageCropModal({ isOpen, onClose, onCropComplete, imageFile }: ImageCropModalProps) {
  const [scale, setScale] = useState(1)
  const [rotate, setRotate] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastTouchDistance, setLastTouchDistance] = useState(0)
  const imageLoadRef = useRef(false)

  const CROP_SIZE = 280 // Fixed circular crop size

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const container = containerRef.current
    if (!container || imageLoadRef.current) return // Prevent multiple calls

    imageLoadRef.current = true

    const containerRect = container.getBoundingClientRect()
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height

    // Calculate image size to fit container while maintaining aspect ratio
    const imgAspect = img.naturalWidth / img.naturalHeight
    const containerAspect = containerWidth / containerHeight

    let displayWidth, displayHeight
    if (imgAspect > containerAspect) {
      displayWidth = containerWidth
      displayHeight = containerWidth / imgAspect
    } else {
      displayHeight = containerHeight
      displayWidth = containerHeight * imgAspect
    }

    setImageSize({ width: displayWidth, height: displayHeight })
    setContainerSize({ width: containerWidth, height: containerHeight })
    
    // Center the crop initially
    setCropPosition({
      x: (containerWidth - CROP_SIZE) / 2,
      y: (containerHeight - CROP_SIZE) / 2
    })
    
    setImageLoaded(true)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageLoaded) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - cropPosition.x,
      y: e.clientY - cropPosition.y
    })
  }


  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageLoaded) return
    e.preventDefault()
    
    if (e.touches.length === 1) {
      // Single touch - drag crop area
      const touch = e.touches[0]
      setIsDragging(true)
      setDragStart({
        x: touch.clientX - cropPosition.x,
        y: touch.clientY - cropPosition.y
      })
    } else if (e.touches.length === 2) {
      // Two finger pinch - zoom
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      setLastTouchDistance(distance)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!imageLoaded) return
    e.preventDefault()
    
    if (e.touches.length === 1 && isDragging) {
      // Single touch - drag crop area
      const touch = e.touches[0]
      const newX = touch.clientX - dragStart.x
      const newY = touch.clientY - dragStart.y
      
      const maxX = Math.max(0, containerSize.width - CROP_SIZE)
      const maxY = Math.max(0, containerSize.height - CROP_SIZE)
      
      setCropPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    } else if (e.touches.length === 2) {
      // Two finger pinch - zoom
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      if (lastTouchDistance > 0) {
        const scaleChange = distance / lastTouchDistance
        setScale(prev => Math.max(0.5, Math.min(3, prev * scaleChange)))
      }
      setLastTouchDistance(distance)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setLastTouchDistance(0)
  }

  const handleRotate = () => {
    setRotate(prev => (prev + 90) % 360)
  }


  const handleCropComplete = useCallback(async () => {
    if (!imgRef.current || !canvasRef.current || !imageFile) return

    setIsProcessing(true)
    
    try {
      const img = imgRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx) throw new Error('No 2d context')

      // Set canvas size to crop size
      canvas.width = CROP_SIZE
      canvas.height = CROP_SIZE

      // Calculate the crop area in image coordinates
      const scaleX = img.naturalWidth / imageSize.width
      const scaleY = img.naturalHeight / imageSize.height
      
      // Calculate the center of the crop area
      const cropCenterX = cropPosition.x + CROP_SIZE / 2
      const cropCenterY = cropPosition.y + CROP_SIZE / 2
      
      // Calculate the image center
      const imageCenterX = containerSize.width / 2
      const imageCenterY = containerSize.height / 2
      
      // Calculate offset from image center
      const offsetX = (cropCenterX - imageCenterX) * scaleX
      const offsetY = (cropCenterY - imageCenterY) * scaleY
      
      // Calculate the crop area in natural image coordinates
      const cropX = (img.naturalWidth / 2) + offsetX - (CROP_SIZE * scaleX) / 2
      const cropY = (img.naturalHeight / 2) + offsetY - (CROP_SIZE * scaleY) / 2
      const cropWidth = CROP_SIZE * scaleX
      const cropHeight = CROP_SIZE * scaleY

      // Create a temporary canvas for rotation and scaling
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) throw new Error('No temp context')

      tempCanvas.width = img.naturalWidth
      tempCanvas.height = img.naturalHeight

      // Apply rotation and scaling
      tempCtx.save()
      tempCtx.translate(img.naturalWidth / 2, img.naturalHeight / 2)
      tempCtx.rotate((rotate * Math.PI) / 180)
      tempCtx.scale(scale, scale)
      tempCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      tempCtx.restore()

      // Draw the cropped area to the final canvas
      ctx.drawImage(
        tempCanvas,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, CROP_SIZE, CROP_SIZE
      )

      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob)
          onClose()
        }
      }, 'image/jpeg', 0.9)
    } catch (error) {
      console.error('Error cropping image:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [cropPosition, imageSize, containerSize, scale, rotate, imageFile, onCropComplete, onClose])

  const handleClose = () => {
    setScale(1)
    setRotate(0)
    setImageLoaded(false)
    setCropPosition({ x: 0, y: 0 })
    setIsDragging(false)
    setLastTouchDistance(0)
    imageLoadRef.current = false
    onClose()
  }

  const removeAvatar = () => {
    onCropComplete(new Blob()) // Empty blob to indicate removal
    onClose()
  }

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }

    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !imageLoaded) return
      e.preventDefault()
      
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      
      const maxX = Math.max(0, containerSize.width - CROP_SIZE)
      const maxY = Math.max(0, containerSize.height - CROP_SIZE)
      
      setCropPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('mouseup', handleGlobalMouseUp)
    }
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, imageLoaded, dragStart, containerSize])

  if (!imageFile) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="p-2"
            >
              <X className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold">Crop Photo</h2>
            <Button
              onClick={handleCropComplete}
              disabled={!imageLoaded || isProcessing}
              className="p-2"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Image Crop Area */}
          <div 
            ref={containerRef}
            className="flex-1 relative overflow-hidden bg-black flex items-center justify-center select-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {imageFile && (
              <img
                ref={imgRef}
                src={URL.createObjectURL(imageFile)}
                alt="Crop me"
                className="max-w-full max-h-full object-contain"
                style={{
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                onLoad={onImageLoad}
                draggable={false}
              />
            )}

            {/* Overlay with circular crop area */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/50" />
              
              {/* Circular crop area */}
              <div
                className="absolute border-2 border-white rounded-full shadow-lg"
                style={{
                  width: CROP_SIZE,
                  height: CROP_SIZE,
                  left: cropPosition.x,
                  top: cropPosition.y,
                  pointerEvents: 'none'
                }}
              >
                {/* Inner circle with reduced opacity */}
                <div className="w-full h-full rounded-full bg-white/20" />
              </div>
            </div>

            {/* Hidden canvas for processing */}
            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>

          {/* Controls */}
          <div className="p-4 border-t bg-background">
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="ghost"
                onClick={handleRotate}
                className="p-3 rounded-full"
                disabled={!imageLoaded}
              >
                <RotateCw className="w-6 h-6" />
              </Button>
              
              <Button
                variant="ghost"
                onClick={removeAvatar}
                className="p-3 rounded-full text-red-500 hover:text-red-600"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Drag to move • Pinch to zoom • Tap rotate
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}