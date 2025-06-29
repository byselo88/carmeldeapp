"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { AuthGuard } from "@/components/auth-guard"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/simple-auth"
import type { VehicleReport, ReportPhoto } from "@/lib/types"
import { ArrowLeft, Calendar, Car, FileText, ZoomIn, Loader2 } from "lucide-react"

interface ReportDetailsPageProps {
  params: {
    id: string
  }
}

export default function FahrerReportDetailsPage({ params }: ReportDetailsPageProps) {
  const [report, setReport] = useState<VehicleReport | null>(null)
  const [photos, setPhotos] = useState<ReportPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    loadReportDetails()
  }, [params.id])

  const loadReportDetails = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      // Report laden (nur eigene Reports)
      const { data: reportData, error: reportError } = await supabase
        .from("vehicle_reports")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id) // Sicherheit: nur eigene Reports
        .single()

      if (reportError) throw reportError
      setReport(reportData)

      // Fotos laden
      const { data: photosData, error: photosError } = await supabase
        .from("report_photos")
        .select("*")
        .eq("report_id", params.id)
        .order("created_at")

      if (photosError) throw photosError
      setPhotos(photosData || [])
    } catch (err) {
      setError("Fehler beim Laden der Berichtdetails")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5) + " Uhr"
  }

  const getPhotoTypeLabel = (type: string) => {
    const labels = {
      vorne_links: "Vorne Links",
      vorne_rechts: "Vorne Rechts",
      hinten_links: "Hinten Links",
      hinten_rechts: "Hinten Rechts",
      optional: "Zusätzlich",
    }
    return labels[type as keyof typeof labels] || type
  }

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

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Bericht nicht gefunden"}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard requiredRole="fahrer">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Car className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="font-semibold text-gray-900">Meldungsdetails</h1>
              <p className="text-sm text-gray-600">{report.license_plate}</p>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto p-4 space-y-6">
          {/* Grundinformationen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Grundinformationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Car className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Fahrzeug</p>
                  <p className="font-medium">{report.license_plate}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Datum & Zeit</p>
                  <p className="font-medium">{formatDate(report.report_date)}</p>
                  <p className="text-sm text-gray-600">{formatTime(report.report_time)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-600">Kilometerstand</p>
                  <p className="font-medium">{report.mileage.toLocaleString("de-DE")} km</p>
                </div>
              </div>

              {report.notes && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Notizen</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{report.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fotos */}
          <Card>
            <CardHeader>
              <CardTitle>Fotos ({photos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Keine Fotos vorhanden</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {photos.map((photo, index) => (
                    <div key={photo.id} className="space-y-2">
                      <Badge variant={photo.is_required ? "default" : "secondary"} className="text-xs">
                        {getPhotoTypeLabel(photo.photo_type)}
                      </Badge>

                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="relative cursor-pointer group">
                            <img
                              src={photo.photo_url || "/placeholder.svg"}
                              alt={getPhotoTypeLabel(photo.photo_type)}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm max-h-[90vh] p-0">
                          <div className="relative">
                            <img
                              src={photo.photo_url || "/placeholder.svg"}
                              alt={getPhotoTypeLabel(photo.photo_type)}
                              className="w-full h-auto max-h-[85vh] object-contain"
                            />
                            <div className="absolute top-4 left-4">
                              <Badge className="bg-black bg-opacity-75 text-white">
                                {getPhotoTypeLabel(photo.photo_type)}
                              </Badge>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
