"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AuthGuard } from "@/components/auth-guard"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/simple-auth"
import type { VehicleReport } from "@/lib/types"
import { ArrowLeft, Calendar, Car, FileText, Loader2, Eye, MoreHorizontal } from "lucide-react"

export default function HistoriePage() {
  const [reports, setReports] = useState<VehicleReport[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const router = useRouter()

  const ITEMS_PER_PAGE = 5

  useEffect(() => {
    loadReports(true)
  }, [])

  const loadReports = async (reset = false) => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const currentOffset = reset ? 0 : offset

      if (reset) {
        setLoading(true)
        setReports([])
        setOffset(0)
      } else {
        setLoadingMore(true)
      }

      const { data, error, count } = await supabase
        .from("vehicle_reports")
        .select(
          `
        *,
        photos:report_photos(id)
      `,
          { count: "exact" },
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(currentOffset, currentOffset + ITEMS_PER_PAGE - 1)

      if (error) throw error

      const newReports = data || []

      if (reset) {
        setReports(newReports)
        setOffset(ITEMS_PER_PAGE)
      } else {
        setReports((prev) => [...prev, ...newReports])
        setOffset((prev) => prev + ITEMS_PER_PAGE)
      }

      // Prüfen ob mehr Daten vorhanden sind
      const totalCount = count || 0
      const nextOffset = reset ? ITEMS_PER_PAGE : currentOffset + ITEMS_PER_PAGE
      setHasMore(nextOffset < totalCount)
    } catch (err) {
      setError("Fehler beim Laden der Historie")
      console.error(err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadReports(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("de-DE")
  }

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5) + " Uhr"
  }

  const openReportDetails = (reportId: string) => {
    router.push(`/fahrer/report/${reportId}`)
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

  return (
    <AuthGuard requiredRole="fahrer">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold text-gray-900">Meine Historie</h1>
          </div>
        </div>

        <div className="max-w-md mx-auto p-4">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {reports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Keine Einträge</h3>
                <p className="text-gray-600 text-sm">Sie haben noch keine Fahrzeugmeldungen erstellt.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {reports.length} {reports.length === 1 ? "Meldung" : "Meldungen"}
                {hasMore && " (weitere verfügbar)"}
              </p>

              {reports.map((report) => (
                <Card key={report.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        {report.license_plate}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {report.photos?.length || 0} Fotos
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {formatDate(report.report_date)} • {formatTime(report.report_time)}
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600">Kilometerstand:</span>
                        <span className="font-medium">{report.mileage.toLocaleString("de-DE")} km</span>
                      </div>

                      {report.notes && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                          <span className="font-medium text-gray-700">Notizen:</span>
                          <p className="mt-1 text-gray-600 line-clamp-2">{report.notes}</p>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-transparent"
                          onClick={() => openReportDetails(report.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Details anzeigen
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="pt-4">
                  <Button variant="outline" className="w-full bg-transparent" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Wird geladen...
                      </>
                    ) : (
                      <>
                        <MoreHorizontal className="h-4 w-4 mr-2" />
                        Weitere Einträge laden
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
