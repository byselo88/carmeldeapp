"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthGuard } from "@/components/auth-guard"
import { supabase } from "@/lib/supabase"
import { signOut, getCurrentUser } from "@/lib/simple-auth"
import type { VehicleReport, User, Vehicle } from "@/lib/types"
import { Car, Users, LogOut, Eye, ChevronLeft, ChevronRight, Loader2, RefreshCw, Settings, Search } from "lucide-react"

export default function AdminPage() {
  const [reports, setReports] = useState<VehicleReport[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [konzessions, setKonzessions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  // Filter states
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([])
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [selectedKonzessions, setSelectedKonzessions] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showDriverDropdown, setShowDriverDropdown] = useState(false)
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)
  const [showKonzessionDropdown, setShowKonzessionDropdown] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  // Automatische Suche beim ersten Laden und bei Seitenwechsel
  useEffect(() => {
    if (initialLoadComplete) {
      handleSearch()
    }
  }, [currentPage, initialLoadComplete])

  const handleSearch = async () => {
    setSearching(true)
    await loadReports()
    setSearching(false)
  }

  const loadData = async () => {
    try {
      const user = await getCurrentUser()
      setCurrentUser(user)

      // Fahrer laden
      const { data: driversData, error: driversError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "fahrer")
        .eq("is_active", true)
        .order("first_name")

      if (driversError) throw driversError
      setDrivers(driversData || [])

      // Fahrzeuge laden
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("is_active", true)
        .order("license_plate")

      if (vehiclesError) throw vehiclesError
      setVehicles(vehiclesData || [])

      // Konzessionen extrahieren
      const uniqueKonzessions = [...new Set(vehiclesData?.map((v) => v.konzession).filter(Boolean))] as string[]
      setKonzessions(uniqueKonzessions.sort())

      // Standard: Heutiger Tag
      const today = new Date().toISOString().split("T")[0]
      setDateFrom(today)
      setDateTo(today)

      setInitialLoadComplete(true)
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
          photos:report_photos(id)
        `,
        { count: "exact" },
      )

      // Filter anwenden
      if (dateFrom) {
        query = query.gte("report_date", dateFrom)
      }

      if (dateTo) {
        query = query.lte("report_date", dateTo)
      }

      if (selectedDrivers.length > 0) {
        query = query.in("user_id", selectedDrivers)
      }

      if (selectedVehicles.length > 0) {
        query = query.in("vehicle_id", selectedVehicles)
      }

      // Konzessions-Filter
      if (selectedKonzessions.length > 0) {
        const vehicleIdsWithKonzession = vehicles
          .filter((v) => selectedKonzessions.includes(v.konzession || ""))
          .map((v) => v.id)

        if (vehicleIdsWithKonzession.length > 0) {
          query = query.in("vehicle_id", vehicleIdsWithKonzession)
        }
      }

      // Paginierung
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await query
        .order("report_date", { ascending: false })
        .order("report_time", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to)

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

  const resetFilters = () => {
    setSelectedDrivers([])
    setSelectedVehicles([])
    setSelectedKonzessions([])
    const today = new Date().toISOString().split("T")[0]
    setDateFrom(today)
    setDateTo(today)
    setCurrentPage(1)
  }

  const toggleDriver = (driverId: string) => {
    setSelectedDrivers((prev) => (prev.includes(driverId) ? prev.filter((id) => id !== driverId) : [...prev, driverId]))
  }

  const toggleVehicle = (vehicleId: string) => {
    setSelectedVehicles((prev) =>
      prev.includes(vehicleId) ? prev.filter((id) => id !== vehicleId) : [...prev, vehicleId],
    )
  }

  const toggleKonzession = (konzession: string) => {
    setSelectedKonzessions((prev) =>
      prev.includes(konzession) ? prev.filter((k) => k !== konzession) : [...prev, konzession],
    )
  }

  const getSelectedDriversText = () => {
    if (selectedDrivers.length === 0) return "Alle Fahrer"
    if (selectedDrivers.length === 1) {
      const driver = drivers.find((d) => d.id === selectedDrivers[0])
      return `${driver?.first_name} ${driver?.last_name}`
    }
    return `${selectedDrivers.length} Fahrer ausgewählt`
  }

  const getSelectedVehiclesText = () => {
    if (selectedVehicles.length === 0) return "Alle Fahrzeuge"
    if (selectedVehicles.length === 1) {
      const vehicle = vehicles.find((v) => v.id === selectedVehicles[0])
      return vehicle?.license_plate
    }
    return `${selectedVehicles.length} Fahrzeuge ausgewählt`
  }

  const getSelectedKonzessionsText = () => {
    if (selectedKonzessions.length === 0) return "Alle Konzessionen"
    if (selectedKonzessions.length === 1) {
      return selectedKonzessions[0]
    }
    return `${selectedKonzessions.length} Konzessionen ausgewählt`
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
              <Button variant="outline" onClick={() => router.push("/admin/vehicles")}>
                <Settings className="h-4 w-4 mr-2" />
                Fahrzeuge
              </Button>
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">Filter & Suche</CardTitle>
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Zurücksetzen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                {/* Fahrer Dropdown */}
                <div className="relative">
                  <label className="text-sm font-medium mb-2 block">Fahrer</label>
                  <Button
                    variant="outline"
                    className="w-full justify-between bg-transparent"
                    onClick={() => setShowDriverDropdown(!showDriverDropdown)}
                  >
                    {getSelectedDriversText()}
                    <span className="ml-2">▼</span>
                  </Button>
                  {showDriverDropdown && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2">
                        {drivers.map((driver) => (
                          <div key={driver.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                            <Checkbox
                              id={`driver-${driver.id}`}
                              checked={selectedDrivers.includes(driver.id)}
                              onCheckedChange={() => toggleDriver(driver.id)}
                            />
                            <label htmlFor={`driver-${driver.id}`} className="text-sm cursor-pointer">
                              {driver.first_name} {driver.last_name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Fahrzeuge Dropdown */}
                <div className="relative">
                  <label className="text-sm font-medium mb-2 block">Fahrzeuge</label>
                  <Button
                    variant="outline"
                    className="w-full justify-between bg-transparent"
                    onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
                  >
                    {getSelectedVehiclesText()}
                    <span className="ml-2">▼</span>
                  </Button>
                  {showVehicleDropdown && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2">
                        {vehicles.map((vehicle) => (
                          <div key={vehicle.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                            <Checkbox
                              id={`vehicle-${vehicle.id}`}
                              checked={selectedVehicles.includes(vehicle.id)}
                              onCheckedChange={() => toggleVehicle(vehicle.id)}
                            />
                            <label htmlFor={`vehicle-${vehicle.id}`} className="text-sm cursor-pointer">
                              {vehicle.license_plate}
                              {vehicle.brand && vehicle.model && (
                                <span className="text-gray-500 ml-2">
                                  ({vehicle.brand} {vehicle.model})
                                </span>
                              )}
                              {vehicle.konzession && (
                                <span className="text-blue-600 ml-2 font-medium">[{vehicle.konzession}]</span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Konzessionen Dropdown */}
                <div className="relative">
                  <label className="text-sm font-medium mb-2 block">Konzessionen</label>
                  <Button
                    variant="outline"
                    className="w-full justify-between bg-transparent"
                    onClick={() => setShowKonzessionDropdown(!showKonzessionDropdown)}
                  >
                    {getSelectedKonzessionsText()}
                    <span className="ml-2">▼</span>
                  </Button>
                  {showKonzessionDropdown && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2">
                        {konzessions.map((konzession) => (
                          <div key={konzession} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                            <Checkbox
                              id={`konzession-${konzession}`}
                              checked={selectedKonzessions.includes(konzession)}
                              onCheckedChange={() => toggleKonzession(konzession)}
                            />
                            <label htmlFor={`konzession-${konzession}`} className="text-sm cursor-pointer">
                              {konzession}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Datum Von */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Von Datum</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>

                {/* Datum Bis */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Bis Datum</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>

              {/* Suchen Button */}
              <div className="flex justify-center">
                <Button onClick={handleSearch} disabled={searching} className="w-full md:w-auto">
                  {searching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Wird gesucht...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Suchen
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                <span>
                  Zeitraum: {formatDate(dateFrom)} - {formatDate(dateTo)}
                </span>
                {selectedDrivers.length > 0 && <span>Fahrer: {selectedDrivers.length} ausgewählt</span>}
                {selectedVehicles.length > 0 && <span>Fahrzeuge: {selectedVehicles.length} ausgewählt</span>}
                {selectedKonzessions.length > 0 && <span>Konzessionen: {selectedKonzessions.length} ausgewählt</span>}
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
                      <TableHead>Konzession</TableHead>
                      <TableHead>Datum/Zeit</TableHead>
                      <TableHead>Kilometerstand</TableHead>
                      <TableHead>Fotos</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Keine Meldungen im ausgewählten Zeitraum gefunden
                        </TableCell>
                      </TableRow>
                    ) : (
                      reports.map((report) => {
                        const vehicle = vehicles.find((v) => v.id === report.vehicle_id)
                        return (
                          <TableRow key={report.id}>
                            <TableCell>
                              {report.user?.first_name} {report.user?.last_name}
                            </TableCell>
                            <TableCell className="font-medium">{report.license_plate}</TableCell>
                            <TableCell>
                              {vehicle?.konzession && <Badge variant="outline">{vehicle.konzession}</Badge>}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{formatDate(report.report_date)}</div>
                                <div className="text-gray-500">{formatTime(report.report_time)}</div>
                              </div>
                            </TableCell>
                            <TableCell>{report.mileage.toLocaleString("de-DE")} km</TableCell>
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
                        )
                      })
                    )}
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

        {/* Click outside to close dropdowns */}
        {(showDriverDropdown || showVehicleDropdown || showKonzessionDropdown) && (
          <div
            className="fixed inset-0 z-5"
            onClick={() => {
              setShowDriverDropdown(false)
              setShowVehicleDropdown(false)
              setShowKonzessionDropdown(false)
            }}
          />
        )}
      </div>
    </AuthGuard>
  )
}
