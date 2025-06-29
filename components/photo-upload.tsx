"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, X, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

interface PhotoUploadProps {
  onPhotosChange: (photos: { file: File; type: string; preview: string }[]) => void
  requiredPhotos: string[]
  className?: string
}

const PHOTO_TYPES = {
  vorne_links: "Vorne Links",
  vorne_rechts: "Vorne Rechts",
  hinten_links: "Hinten Links",
  hinten_rechts: "Hinten Rechts",
  optional: "Zusätzlich",
}

export function PhotoUpload({ onPhotosChange, requiredPhotos, className }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<{ file: File; type: string; preview: string }[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentPhotoType, setCurrentPhotoType] = useState<string>("")

  const handleFileSelect = (files: FileList | null, photoType: string) => {
    if (!files || files.length === 0) return

    const file = files[0]

    // Validierung
    if (!file.type.startsWith("image/")) {
      alert("Bitte wählen Sie eine Bilddatei aus.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      alert("Die Datei ist zu groß. Maximale Größe: 10MB")
      return
    }

    // Prüfen ob bereits ein Foto dieses Typs existiert (außer optional)
    if (photoType !== "optional") {
      const existingIndex = photos.findIndex((p) => p.type === photoType)
      if (existingIndex !== -1) {
        // Ersetzen
        const newPhotos = [...photos]
        URL.revokeObjectURL(newPhotos[existingIndex].preview)
        newPhotos[existingIndex] = {
          file,
          type: photoType,
          preview: URL.createObjectURL(file),
        }
        setPhotos(newPhotos)
        onPhotosChange(newPhotos)
        return
      }
    }

    // Neues Foto hinzufügen
    const newPhoto = {
      file,
      type: photoType,
      preview: URL.createObjectURL(file),
    }

    const newPhotos = [...photos, newPhoto]
    setPhotos(newPhotos)
    onPhotosChange(newPhotos)

    // Simulate upload progress
    setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }))
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        const current = prev[file.name] || 0
        if (current >= 100) {
          clearInterval(interval)
          return { ...prev, [file.name]: 100 }
        }
        return { ...prev, [file.name]: current + 10 }
      })
    }, 100)
  }

  const removePhoto = (index: number) => {
    const newPhotos = [...photos]
    URL.revokeObjectURL(newPhotos[index].preview)
    newPhotos.splice(index, 1)
    setPhotos(newPhotos)
    onPhotosChange(newPhotos)
  }

  const openCamera = (photoType: string) => {
    setCurrentPhotoType(photoType)
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*"
      fileInputRef.current.capture = "environment"
      fileInputRef.current.click()
    }
  }

  const getPhotoForType = (type: string) => {
    return photos.find((p) => p.type === type)
  }

  const isRequiredPhotoMissing = () => {
    return requiredPhotos.some((type) => !getPhotoForType(type))
  }

  return (
    <div className={cn("space-y-4", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files, currentPhotoType)}
      />

      {/* Pflichtfotos */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">
          Pflichtfotos <span className="text-red-500">*</span>
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {requiredPhotos.map((photoType) => {
            const photo = getPhotoForType(photoType)
            const progress = photo ? uploadProgress[photo.file.name] : undefined

            return (
              <Card key={photoType} className="relative">
                <CardContent className="p-3">
                  {photo ? (
                    <div className="relative">
                      <img
                        src={photo.preview || "/placeholder.svg"}
                        alt={PHOTO_TYPES[photoType as keyof typeof PHOTO_TYPES]}
                        className="w-full h-32 object-cover rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removePhoto(photos.indexOf(photo))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {progress !== undefined && progress < 100 && (
                        <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 rounded">
                          <div
                            className="bg-blue-500 h-1 rounded transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-32 flex flex-col items-center justify-center gap-2 border-dashed bg-transparent"
                      onClick={() => openCamera(photoType)}
                    >
                      <Camera className="h-6 w-6" />
                      <span className="text-xs text-center">{PHOTO_TYPES[photoType as keyof typeof PHOTO_TYPES]}</span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Zusätzliche Fotos */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Zusätzliche Fotos (optional)</h3>

        <Button
          type="button"
          variant="outline"
          className="w-full h-16 flex items-center justify-center gap-2 border-dashed bg-transparent"
          onClick={() => openCamera("optional")}
        >
          <Upload className="h-5 w-5" />
          <span>Weiteres Foto hinzufügen</span>
        </Button>

        {photos.filter((p) => p.type === "optional").length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {photos
              .filter((p) => p.type === "optional")
              .map((photo, index) => {
                const progress = uploadProgress[photo.file.name]

                return (
                  <Card key={`optional-${index}`} className="relative">
                    <CardContent className="p-3">
                      <div className="relative">
                        <img
                          src={photo.preview || "/placeholder.svg"}
                          alt="Zusätzliches Foto"
                          className="w-full h-32 object-cover rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => removePhoto(photos.indexOf(photo))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        {progress !== undefined && progress < 100 && (
                          <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 rounded">
                            <div
                              className="bg-blue-500 h-1 rounded transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        )}
      </div>

      {isRequiredPhotoMissing() && (
        <p className="text-sm text-red-600">
          Bitte fügen Sie alle Pflichtfotos hinzu. <span className="text-red-500">*</span>
        </p>
      )}
    </div>
  )
}
