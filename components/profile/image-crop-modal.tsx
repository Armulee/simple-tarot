"use client"

import { useState, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Crop, X, RotateCcw, Check } from "lucide-react"
import ReactCrop, { Crop as CropType, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"

interface ImageCropModalProps {
  isOpen: boolean
  onClose: () => void
  onCropComplete: (croppedImageBlob: Blob) => void
  imageFile: File | null
}

export function ImageCropModal({ isOpen, onClose, onCropComplete, imageFile }: ImageCropModalProps) {
  const [crop, setCrop] = useState<CropType>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [scale, setScale] = useState(1)
  const [rotate, setRotate] = useState(0)
  const [aspect, setAspect] = useState<number | undefined>(1)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const imgRef = useRef<HTMLImageElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (aspect) {
      const { width, height } = e.currentTarget
      const crop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          aspect,
          width,
          height
        ),
        width,
        height
      )
      setCrop(crop)
    }
  }, [aspect])

  const onDownloadCropClick = useCallback(async () => {
    if (!completedCrop || !previewCanvasRef.current || !imgRef.current) {
      return
    }

    setIsProcessing(true)
    
    try {
      const image = imgRef.current
      const canvas = previewCanvasRef.current
      const crop = completedCrop

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('No 2d context')
      }

      const pixelRatio = window.devicePixelRatio
      canvas.width = crop.width * pixelRatio * scaleX
      canvas.height = crop.height * pixelRatio * scaleY

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.imageSmoothingQuality = 'high'

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width * scaleX,
        crop.height * scaleY
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
  }, [completedCrop, onCropComplete, onClose])

  const handleClose = () => {
    setCrop(undefined)
    setCompletedCrop(undefined)
    setScale(1)
    setRotate(0)
    onClose()
  }

  const resetCrop = () => {
    setCrop(undefined)
    setCompletedCrop(undefined)
    setScale(1)
    setRotate(0)
  }

  const removeAvatar = () => {
    onCropComplete(new Blob()) // Empty blob to indicate removal
    onClose()
  }

  if (!imageFile) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5" />
            Crop Profile Picture
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Crop Area */}
          <div className="flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              minWidth={100}
              minHeight={100}
              className="max-h-[400px]"
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={URL.createObjectURL(imageFile)}
                style={{
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                  maxHeight: '400px',
                  maxWidth: '100%',
                }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="scale" className="text-sm font-medium">
                  Scale:
                </label>
                <input
                  id="scale"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">{Math.round(scale * 100)}%</span>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="rotate" className="text-sm font-medium">
                  Rotate:
                </label>
                <input
                  id="rotate"
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={rotate}
                  onChange={(e) => setRotate(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">{rotate}°</span>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="aspect" className="text-sm font-medium">
                  Aspect:
                </label>
                <select
                  id="aspect"
                  value={aspect || ''}
                  onChange={(e) => setAspect(e.target.value ? Number(e.target.value) : undefined)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="">Free</option>
                  <option value={1}>1:1 (Square)</option>
                  <option value={16/9}>16:9</option>
                  <option value={4/3}>4:3</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={resetCrop}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={removeAvatar}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Remove Avatar
                </Button>

                <Button
                  onClick={onDownloadCropClick}
                  disabled={!completedCrop || isProcessing}
                  className="flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Apply Crop
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview */}
          {completedCrop && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Preview:</h4>
              <div className="flex justify-center">
                <canvas
                  ref={previewCanvasRef}
                  className="border rounded-lg max-w-[200px] max-h-[200px]"
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '200px',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}