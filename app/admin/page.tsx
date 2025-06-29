"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AuthGuard } from "@/components/auth-guard"
import { supabase } from "@/lib/supabase"
import { signOut, getCurrentUser } from "@/lib/auth"
import type { VehicleReport, User } from "@/lib/types"
import { Car, Users, LogOut, Search, Filter, Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

export default function AdminPage() {
  const [reports, setReports] = useState<VehicleReport[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Filter states
  const [selectedUsers, setSelectedUsers] = useState<string[]>([""])
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([""])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadReports()
  }, [selectedUsers, selectedVehicles, dateFrom, dateTo, searchTerm, currentPage])

  const loadData = async () => {
    try {
      const user = await getCurrentUser()
      setCurrentUser(user)

      // Benutzer laden
      const { data: usersData } = await supabase.from("users").select("*").eq("role", "fahrer").order("first_name")

      setUsers(usersData || [])

      // Fahrzeuge laden
      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select("*")
        .eq("is_active", true)
        .order("license_plate")

      setVehicles(vehiclesData || [])

      // Standard: letzte 3 Tage
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      setDateFrom(threeDaysAgo.toISOString().split("T")[0])
      setDateTo(new Date().toISOString().split("T")[0])
    } catch (err) {
      console.error("Error loading data:", err)
    } finally {
      setLoading(false)
    }
  }

  const loadReports = async () => {
    try {
      let query = supabase.from("vehicle_reports").select(
        `
          *,
          user:users(first_name, last_name),
          photos:report_photos(*)
        `,
        { count: "exact" },
      )

      // Filter anwenden
      if (selectedUsers.length > 0 && selectedUsers[0] !== "") {
        query = query.in("user_id", selectedUsers)
      }

      if (selectedVehicles.length > 0 && selectedVehicles[0] !== "") {
        query = query.in("vehicle_id", selectedVehicles)
      }

      if (dateFrom) {
        query = query.gte("report_date", dateFrom)
      }

      if (dateTo) {
        query = query.lte("report_date", dateTo)
      }

      if (searchTerm) {
        query = query.or(`license_plate.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
      }

      // Paginierung
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to)

      if (error) throw error

      setReports(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (err) {
      console.error("Error loading reports:", err)
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("de-DE")
  }

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5) + " Uhr"
  }

  const openReportDetails = (reportId: string) => {
    window.open(`/admin/report/${reportId}`, "_blank")
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
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="font-semibold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">
                  {currentUser?.first_name} {currentUser?.last_name}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/admin/users")}>
                <Users className="h-4 w-4 mr-2" />
                Benutzer
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4">
          {/* Filter */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Fahrer</label>
                  <Select
                    value={selectedUsers.join(",")}
                    onValueChange={(value) => setSelectedUsers(value ? value.split(",") : [""])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Alle Fahrer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Alle Fahrer</SelectItem>
                      {users
                        .filter((u) => u.is_active)
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.first_name} {user.last_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Fahrzeug</label>
                  <Select
                    value={selectedVehicles.join(",")}
                    onValueChange={(value) => setSelectedVehicles(value ? value.split(",") : [""])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Alle Fahrzeuge" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Alle Fahrzeuge</SelectItem>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.license_plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Von Datum</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Bis Datum</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>

              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Suche nach Kennzeichen oder Notizen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabelle */}
          <Card>
            <CardHeader>
              <CardTitle>Fahrzeugmeldungen ({reports.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fahrer</TableHead>
                      <TableHead>Fahrzeug</TableHead>
                      <TableHead>Datum/Zeit</TableHead>
                      <TableHead>Kilometerstand</TableHead>
                      <TableHead>Notizen</TableHead>
                      <TableHead>Fotos</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          {report.user?.first_name} {report.user?.last_name}
                        </TableCell>
                        <TableCell className="font-medium">{report.license_plate}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDate(report.report_date)}</div>
                            <div className="text-gray-500">{formatTime(report.report_time)}</div>
                          </div>
                        </TableCell>
                        <TableCell>{report.mileage.toLocaleString("de-DE")} km</TableCell>
                        <TableCell>
                          {report.notes ? (
                            <div className="max-w-xs truncate" title={report.notes}>
                              {report.notes}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.photos?.length || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => openReportDetails(report.id)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-600">
                    Seite {currentPage} von {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
