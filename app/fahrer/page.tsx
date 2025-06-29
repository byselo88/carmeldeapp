"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthGuard } from "@/components/auth-guard"
import { PhotoUpload } from "@/components/photo-upload"
import { supabase } from "@/lib/supabase"
import { signOut, getCurrentUser } from "@/lib/simple-auth"
import type { Vehicle, UserFavoriteVehicle } from "@/lib/types"
import { Car, History, LogOut, Loader2, CheckCircle, ChevronDown, Star, StarOff } from "lucide-react"

export default function FahrerPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [favoriteVehicles, setFavoriteVehicles] = useState<UserFavoriteVehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState("")
  const [mileage, setMileage] = useState("")
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<{ file: File; type: string; preview: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)
  const [showFavoritesManager, setShowFavoritesManager] = useState(false)
  const router = useRouter()

  const requiredPhotoTypes = ["vorne_links", "vorne_rechts", "hinten_links", "hinten_rechts"]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Benutzer laden
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      // Fahrzeuge laden
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("is_active", true)
        .order("license_plate")

      if (vehiclesError) throw vehiclesError
      setVehicles(vehiclesData || [])

      // Favoriten-Fahrzeuge laden
      if (currentUser) {
        const { data: favoritesData, error: favoritesError } = await supabase
          .from("user_favorite_vehicles")
          .select(`
            *,
            vehicle:vehicles(*)
          `)
          .eq("user_id", currentUser.id)

        if (favoritesError) throw favoritesError
        setFavoriteVehicles(favoritesData || [])
      }
    } catch (err) {
      setError("Daten konnten nicht geladen werden")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (vehicleId: string) => {
    if (!user) return

    try {
      const isFavorite = favoriteVehicles.some((fav) => fav.vehicle_id === vehicleId)

      if (isFavorite) {
        // Favorit entfernen
        const { error } = await supabase
          .from("user_favorite_vehicles")
          .delete()
          .eq("user_id", user.id)
          .eq("vehicle_id", vehicleId)

        if (error) throw error

        setFavoriteVehicles((prev) => prev.filter((fav) => fav.vehicle_id !== vehicleId))
      } else {
        // Favorit hinzufügen
        const { data, error } = await supabase
          .from("user_favorite_vehicles")
          .insert({
            user_id: user.id,
            vehicle_id: vehicleId,
          })
          .select(`
            *,
            vehicle:vehicles(*)
          `)
          .single()

        if (error) throw error

        setFavoriteVehicles((prev) => [...prev, data])
      }
    } catch (err) {
      console.error("Error toggling favorite:", err)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (err) {
      console.error("Logout failed:", err)
    }
  }

  const validateForm = () => {
    if (!selectedVehicle) {
      setError("Bitte wählen Sie ein Fahrzeug aus.")
      return false
    }

    if (!mileage || Number.parseInt(mileage) < 0) {
      setError("Bitte geben Sie einen gültigen Kilometerstand ein.")
      return false
    }

    const requiredPhotos = photos.filter((p) => requiredPhotoTypes.includes(p.type))
    if (requiredPhotos.length < 4) {
      setError("Bitte fügen Sie alle 4 Pflichtfotos hinzu.")
      return false
    }

    return true
  }

  // Vereinfachter Upload - speichere Fotos als Base64 in der Datenbank
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const resetForm = () => {
    setSelectedVehicle("")
    setMileage("")
    setNotes("")
    setPhotos([])
    setError("")
    setShowVehicleDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (!validateForm()) return

    setSubmitting(true)

    try {
      const selectedVehicleData = vehicles.find((v) => v.id === selectedVehicle)
      if (!selectedVehicleData) throw new Error("Fahrzeug nicht gefunden")

      // Report erstellen
      const now = new Date()
      const { data: reportData, error: reportError } = await supabase
        .from("vehicle_reports")
        .insert({
          user_id: user.id,
          vehicle_id: selectedVehicle,
          license_plate: selectedVehicleData.license_plate,
          mileage: Number.parseInt(mileage),
          notes: notes.trim() || null,
          report_date: now.toISOString().split("T")[0],
          report_time: now.toTimeString().split(" ")[0].substring(0, 5),
        })
        .select()
        .single()

      if (reportError) throw reportError

      // Fotos als Base64 speichern (temporäre Lösung)
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        try {
          const base64Data = await convertToBase64(photo.file)

          const { error: photoError } = await supabase.from("report_photos").insert({
            report_id: reportData.id,
            photo_url: base64Data, // Base64 statt Storage URL
            photo_type: photo.type,
            is_required: requiredPhotoTypes.includes(photo.type),
          })

          if (photoError) {
            console.error("Photo insert error:", photoError)
            throw photoError
          }
        } catch (photoErr) {
          console.error("Photo processing error:", photoErr)
          throw new Error(`Fehler beim Verarbeiten des Fotos: ${photo.type}`)
        }
      }

      // Erfolg anzeigen und sofort nach oben scrollen
      window.scrollTo({ top: 0, behavior: "smooth" })
      setSuccess(true)

      // Form sofort zurücksetzen
      resetForm()

      // Success-Message nach 8 Sekunden ausblenden
      setTimeout(() => setSuccess(false), 8000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern")
      console.error("Submit error:", err)
      // Bei Fehler auch nach oben scrollen
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setSubmitting(false)
    }
  }

  const getSelectedVehicleText = () => {
    if (!selectedVehicle) return "Fahrzeug auswählen"
    const vehicle = vehicles.find((v) => v.id === selectedVehicle)
    return vehicle
      ? `${vehicle.license_plate}${vehicle.brand && vehicle.model ? ` (${vehicle.brand} ${vehicle.model})` : ""}`
      : "Fahrzeug auswählen"
  }

  const isFavorite = (vehicleId: string) => {
    return favoriteVehicles.some((fav) => fav.vehicle_id === vehicleId)
  }

  // Fahrzeuge sortieren: Favoriten zuerst, dann alphabetisch
  const sortedVehicles = [...vehicles].sort((a, b) => {
    const aIsFavorite = isFavorite(a.id)
    const bIsFavorite = isFavorite(b.id)

    if (aIsFavorite && !bIsFavorite) return -1
    if (!aIsFavorite && bIsFavorite) return 1
    return a.license_plate.localeCompare(b.license_plate)
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Wird geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard requiredRole="fahrer">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="font-semibold text-gray-900">Car Melde App</h1>
                <p className="text-sm text-gray-600">
                  {user?.first_name} {user?.last_name}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFavoritesManager(true)}>
                <Star className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push("/fahrer/historie")}>
                <History className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto p-4">
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-1">
                  <div className="font-semibold">✅ Meldung erfolgreich gespeichert!</div>
                  <div className="text-sm">
                    Ihre Fahrzeugmeldung wurde erfolgreich übermittelt und kann in der Historie eingesehen werden.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Fahrzeugzustand melden</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Fahrzeug Dropdown */}
                <div className="space-y-2 relative">
                  <Label>
                    Fahrzeug <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between h-12 bg-transparent"
                    onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
                  >
                    {getSelectedVehicleText()}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  {showVehicleDropdown && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-1">
                        {favoriteVehicles.length > 0 && (
                          <>
                            <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                              ⭐ Favoriten
                            </div>
                            {favoriteVehicles.map((favorite) => {
                              const vehicle = favorite.vehicle
                              if (!vehicle) return null
                              return (
                                <button
                                  key={vehicle.id}
                                  type="button"
                                  className="w-full text-left p-3 hover:bg-gray-50 border-b flex items-center justify-between"
                                  onClick={() => {
                                    setSelectedVehicle(vehicle.id)
                                    setShowVehicleDropdown(false)
                                  }}
                                >
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                      {vehicle.license_plate}
                                    </div>
                                    {vehicle.brand && vehicle.model && (
                                      <div className="text-sm text-gray-500">
                                        {vehicle.brand} {vehicle.model}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              )
                            })}
                            <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                              Alle Fahrzeuge
                            </div>
                          </>
                        )}
                        {vehicles.map((vehicle) => {
                          const isVehicleFavorite = isFavorite(vehicle.id)

                          return (
                            <button
                              key={vehicle.id}
                              type="button"
                              className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between"
                              onClick={() => {
                                setSelectedVehicle(vehicle.id)
                                setShowVehicleDropdown(false)
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {isVehicleFavorite && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                                <div>
                                  <div className="font-medium">{vehicle.license_plate}</div>
                                  {vehicle.brand && vehicle.model && (
                                    <div className="text-sm text-gray-500">
                                      {vehicle.brand} {vehicle.model}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mileage">
                    Kilometerstand <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    placeholder="z.B. 45000"
                    className="h-12"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notizen (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Besondere Vorkommnisse, Schäden, etc."
                    className="min-h-[80px]"
                  />
                </div>

                <PhotoUpload onPhotosChange={setPhotos} requiredPhotos={requiredPhotoTypes} photos={photos} />

                <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    "Meldung absenden"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Favoriten-Manager Modal */}
        {showFavoritesManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Favoriten verwalten
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowFavoritesManager(false)}>
                    ✕
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Wählen Sie Ihre häufig genutzten Fahrzeuge als Favoriten aus
                </p>
              </div>

              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {vehicles.map((vehicle) => {
                    const isVehicleFavorite = isFavorite(vehicle.id)
                    return (
                      <div
                        key={vehicle.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div>
                          <div className="font-medium">{vehicle.license_plate}</div>
                          {vehicle.brand && vehicle.model && (
                            <div className="text-sm text-gray-500">
                              {vehicle.brand} {vehicle.model}
                            </div>
                          )}
                          {vehicle.konzession && (
                            <div className="text-xs text-blue-600 font-medium">Konzession: {vehicle.konzession}</div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => toggleFavorite(vehicle.id)} className="p-2">
                          {isVehicleFavorite ? (
                            <Star className="h-5 w-5 text-yellow-500 fill-current" />
                          ) : (
                            <StarOff className="h-5 w-5 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50">
                <div className="text-sm text-gray-600 mb-3">
                  {favoriteVehicles.length} von {vehicles.length} Fahrzeugen als Favorit markiert
                </div>
                <Button onClick={() => setShowFavoritesManager(false)} className="w-full">
                  Fertig
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Click outside to close dropdown */}
        {showVehicleDropdown && <div className="fixed inset-0 z-5" onClick={() => setShowVehicleDropdown(false)} />}
      </div>
    </AuthGuard>
  )
}
