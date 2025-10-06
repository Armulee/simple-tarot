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
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastTouchDistance, setLastTouchDistance] = useState(0)
  const [lastTouchCenter, setLastTouchCenter] = useState({ x: 0, y: 0 })
  const imageLoadRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const pendingUpdateRef = useRef<{ scale?: number; position?: { x: number; y: number } } | null>(null)

  const CROP_SIZE = 280 // Fixed circular crop size

  // Throttled update function to prevent excessive re-renders
  const updateImageState = useCallback((updates: { scale?: number; position?: { x: number; y: number } }) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    pendingUpdateRef.current = { ...pendingUpdateRef.current, ...updates }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      if (pendingUpdateRef.current) {
        if (pendingUpdateRef.current.scale !== undefined) {
          setScale(pendingUpdateRef.current.scale)
        }
        if (pendingUpdateRef.current.position) {
          setImagePosition(pendingUpdateRef.current.position)
        }
        pendingUpdateRef.current = null
      }
      animationFrameRef.current = null
    })
  }, [])

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
    
    // Calculate minimum scale to fit circle inside image
    const minScaleX = CROP_SIZE / displayWidth
    const minScaleY = CROP_SIZE / displayHeight
    const minScale = Math.max(minScaleX, minScaleY, 0.5) // Ensure minimum scale is at least 0.5
    
    setScale(minScale)
    
    // Center the image initially
    setImagePosition({
      x: (containerWidth - displayWidth) / 2,
      y: (containerHeight - displayHeight) / 2
    })
    
    setImageLoaded(true)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageLoaded) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    })
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (!imageLoaded) return
    e.preventDefault()
    
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.5, Math.min(3, scale * delta))
    
    if (newScale !== scale) {
      // Calculate minimum scale to keep circle within image bounds
      const minScaleX = CROP_SIZE / imageSize.width
      const minScaleY = CROP_SIZE / imageSize.height
      const minScale = Math.max(minScaleX, minScaleY, 0.5)
      
      const finalScale = Math.max(minScale, newScale)
      
      // Calculate the point on the image that should stay under the mouse
      // First, convert mouse position to image coordinates (accounting for current scale)
      const imagePointX = (mouseX - imagePosition.x) / scale
      const imagePointY = (mouseY - imagePosition.y) / scale
      
      // Calculate new image position to keep that point under the mouse
      // The point on the image should remain at the same mouse position
      const newImageX = mouseX - (imagePointX * finalScale)
      const newImageY = mouseY - (imagePointY * finalScale)
      
      // Calculate bounds to keep image within reasonable limits
      const scaledImageWidth = imageSize.width * finalScale
      const scaledImageHeight = imageSize.height * finalScale
      
      // Calculate the center of the container
      const centerX = containerSize.width / 2
      const centerY = containerSize.height / 2
      
      // Calculate how much the image can move in each direction
      // The image should be able to move so that any part can be centered
      const maxOffsetX = Math.max(0, (scaledImageWidth - CROP_SIZE) / 2)
      const maxOffsetY = Math.max(0, (scaledImageHeight - CROP_SIZE) / 2)
      
      const maxX = centerX + maxOffsetX
      const maxY = centerY + maxOffsetY
      const minX = centerX - maxOffsetX
      const minY = centerY - maxOffsetY
      
      updateImageState({
        scale: finalScale,
        position: {
          x: Math.max(minX, Math.min(newImageX, maxX)),
          y: Math.max(minY, Math.min(newImageY, maxY))
        }
      })
    }
  }


  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageLoaded) return
    e.preventDefault()
    e.stopPropagation()
    
    if (e.touches.length === 1) {
      // Single touch - drag image
      const touch = e.touches[0]
      setIsDragging(true)
      setDragStart({
        x: touch.clientX - imagePosition.x,
        y: touch.clientY - imagePosition.y
      })
    } else if (e.touches.length === 2) {
      // Two finger pinch - zoom
      e.preventDefault()
      e.stopPropagation()
      
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      // Calculate center point of pinch
      const centerX = (touch1.clientX + touch2.clientX) / 2
      const centerY = (touch1.clientY + touch2.clientY) / 2
      
      setLastTouchDistance(distance)
      setLastTouchCenter({ x: centerX, y: centerY })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!imageLoaded) return
    e.preventDefault()
    e.stopPropagation()
    
    if (e.touches.length === 1 && isDragging) {
      // Single touch - drag image
      const touch = e.touches[0]
      const newX = touch.clientX - dragStart.x
      const newY = touch.clientY - dragStart.y
      
      // Calculate bounds to keep image within reasonable limits
      const scaledImageWidth = imageSize.width * scale
      const scaledImageHeight = imageSize.height * scale
      
      // Calculate the center of the container
      const centerX = containerSize.width / 2
      const centerY = containerSize.height / 2
      
      // Calculate how much the image can move in each direction
      const maxOffsetX = Math.max(0, (scaledImageWidth - CROP_SIZE) / 2)
      const maxOffsetY = Math.max(0, (scaledImageHeight - CROP_SIZE) / 2)
      
      const maxX = centerX + maxOffsetX
      const maxY = centerY + maxOffsetY
      const minX = centerX - maxOffsetX
      const minY = centerY - maxOffsetY
      
      updateImageState({
        position: {
          x: Math.max(minX, Math.min(newX, maxX)),
          y: Math.max(minY, Math.min(newY, maxY))
        }
      })
    } else if (e.touches.length === 2) {
      // Two finger pinch - zoom and drag simultaneously
      e.preventDefault()
      e.stopPropagation()
      
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      // Calculate current pinch center
      const currentCenterX = (touch1.clientX + touch2.clientX) / 2
      const currentCenterY = (touch1.clientY + touch2.clientY) / 2
      
      if (lastTouchDistance > 0) {
        const scaleChange = distance / lastTouchDistance
        const newScale = Math.max(0.5, Math.min(3, scale * scaleChange))
        
        if (newScale !== scale) {
          // Calculate minimum scale to keep circle within image bounds
          const minScaleX = CROP_SIZE / imageSize.width
          const minScaleY = CROP_SIZE / imageSize.height
          const minScale = Math.max(minScaleX, minScaleY, 0.5)
          
          const finalScale = Math.max(minScale, newScale)
          
          // Calculate the point on the image that should stay under the pinch center
          const rect = e.currentTarget.getBoundingClientRect()
          const pinchX = currentCenterX - rect.left
          const pinchY = currentCenterY - rect.top
          
          const imagePointX = (pinchX - imagePosition.x) / scale
          const imagePointY = (pinchY - imagePosition.y) / scale
          
          // Calculate new image position to keep that point under the pinch center
          const newImageX = pinchX - (imagePointX * finalScale)
          const newImageY = pinchY - (imagePointY * finalScale)
          
          // Calculate bounds to keep image within reasonable limits
          const scaledImageWidth = imageSize.width * finalScale
          const scaledImageHeight = imageSize.height * finalScale
          
          // Calculate the center of the container
          const centerX = containerSize.width / 2
          const centerY = containerSize.height / 2
          
          // Calculate how much the image can move in each direction
          const maxOffsetX = Math.max(0, (scaledImageWidth - CROP_SIZE) / 2)
          const maxOffsetY = Math.max(0, (scaledImageHeight - CROP_SIZE) / 2)
          
          const maxX = centerX + maxOffsetX
          const maxY = centerY + maxOffsetY
          const minX = centerX - maxOffsetX
          const minY = centerY - maxOffsetY
          
          updateImageState({
            scale: finalScale,
            position: {
              x: Math.max(minX, Math.min(newImageX, maxX)),
              y: Math.max(minY, Math.min(newImageY, maxY))
            }
          })
        }
      }
      
      // Handle drag movement during pinch
      if (lastTouchCenter.x !== 0 && lastTouchCenter.y !== 0) {
        const deltaX = currentCenterX - lastTouchCenter.x
        const deltaY = currentCenterY - lastTouchCenter.y
        
        const newX = imagePosition.x + deltaX
        const newY = imagePosition.y + deltaY
        
        // Calculate bounds to keep image within reasonable limits
        const scaledImageWidth = imageSize.width * scale
        const scaledImageHeight = imageSize.height * scale
        
        // Calculate the center of the container
        const centerX = containerSize.width / 2
        const centerY = containerSize.height / 2
        
        // Calculate how much the image can move in each direction
        const maxOffsetX = Math.max(0, (scaledImageWidth - CROP_SIZE) / 2)
        const maxOffsetY = Math.max(0, (scaledImageHeight - CROP_SIZE) / 2)
        
        const maxX = centerX + maxOffsetX
        const maxY = centerY + maxOffsetY
        const minX = centerX - maxOffsetX
        const minY = centerY - maxOffsetY
        
        updateImageState({
          position: {
            x: Math.max(minX, Math.min(newX, maxX)),
            y: Math.max(minY, Math.min(newY, maxY))
          }
        })
      }
      
      setLastTouchDistance(distance)
      setLastTouchCenter({ x: currentCenterX, y: currentCenterY })
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
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
      
      // The crop area is fixed in the center, so we need to calculate what part of the image is visible
      const centerX = containerSize.width / 2
      const centerY = containerSize.height / 2
      
      // Calculate the image's position relative to the center
      const imageCenterX = imagePosition.x + (imageSize.width * scale) / 2
      const imageCenterY = imagePosition.y + (imageSize.height * scale) / 2
      
      // Calculate the offset from the crop center to the image center
      const offsetX = (imageCenterX - centerX) / scale
      const offsetY = (imageCenterY - centerY) / scale
      
      // Calculate the crop area in the original image coordinates
      const cropX = (imageSize.width / 2 - CROP_SIZE / 2 + offsetX) * scaleX
      const cropY = (imageSize.height / 2 - CROP_SIZE / 2 + offsetY) * scaleY
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
  }, [imagePosition, imageSize, containerSize, scale, rotate, imageFile, onCropComplete, onClose])

  const handleClose = () => {
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    setScale(1)
    setRotate(0)
    setImageLoaded(false)
    setImagePosition({ x: 0, y: 0 })
    setIsDragging(false)
    setLastTouchDistance(0)
    setLastTouchCenter({ x: 0, y: 0 })
    imageLoadRef.current = false
    pendingUpdateRef.current = null
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

    // Prevent page zoom when modal is open
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    window.addEventListener('resize', handleResize)
    document.addEventListener('touchstart', preventZoom, { passive: false })
    document.addEventListener('touchmove', preventZoom, { passive: false })
    
    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('touchstart', preventZoom)
      document.removeEventListener('touchmove', preventZoom)
    }
  }, [])

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !imageLoaded) return
      e.preventDefault()
      
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      
      // Calculate bounds to keep image within reasonable limits
      const scaledImageWidth = imageSize.width * scale
      const scaledImageHeight = imageSize.height * scale
      
      // Calculate the center of the container
      const centerX = containerSize.width / 2
      const centerY = containerSize.height / 2
      
      // Calculate how much the image can move in each direction
      const maxOffsetX = Math.max(0, (scaledImageWidth - CROP_SIZE) / 2)
      const maxOffsetY = Math.max(0, (scaledImageHeight - CROP_SIZE) / 2)
      
      const maxX = centerX + maxOffsetX
      const maxY = centerY + maxOffsetY
      const minX = centerX - maxOffsetX
      const minY = centerY - maxOffsetY
      
      updateImageState({
        position: {
          x: Math.max(minX, Math.min(newX, maxX)),
          y: Math.max(minY, Math.min(newY, maxY))
        }
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
  }, [isDragging, imageLoaded, dragStart, containerSize, imageSize, scale, imagePosition, updateImageState])

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  if (!imageFile) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-md w-full h-[90vh] p-0 overflow-hidden"
        style={{ touchAction: 'none' }}
      >
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
            style={{ touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {imageFile && (
              <img
                ref={imgRef}
                src={URL.createObjectURL(imageFile)}
                alt="Crop me"
                className="absolute object-contain"
                style={{
                  width: imageSize.width,
                  height: imageSize.height,
                  left: imagePosition.x,
                  top: imagePosition.y,
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out, left 0.05s ease-out, top 0.05s ease-out',
                  touchAction: 'none',
                  willChange: isDragging ? 'transform, left, top' : 'auto'
                }}
                onLoad={onImageLoad}
                draggable={false}
              />
            )}

            {/* Overlay with circular crop area */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/50" />
              
              {/* Circular crop area - fixed in center */}
              <div
                className="absolute border-2 border-white rounded-full shadow-lg"
                style={{
                  width: CROP_SIZE,
                  height: CROP_SIZE,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
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