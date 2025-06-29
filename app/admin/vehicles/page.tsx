"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthGuard } from "@/components/auth-guard"
import { supabase } from "@/lib/supabase"
import type { Vehicle } from "@/lib/types"
import { ArrowLeft, Plus, Car, Loader2, CheckCircle, XCircle, Edit, Trash2 } from "lucide-react"

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)

  // Form states
  const [licensePlate, setLicensePlate] = useState("")
  const [brand, setBrand] = useState("")
  const [model, setModel] = useState("")
  const [konzession, setKonzession] = useState("")

  const router = useRouter()

  useEffect(() => {
    loadVehicles()
  }, [])

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase.from("vehicles").select("*").order("license_plate")

      if (error) throw error
      setVehicles(data || [])
    } catch (err) {
      setError("Fehler beim Laden der Fahrzeuge")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setLicensePlate("")
    setBrand("")
    setModel("")
    setKonzession("")
    setError("")
    setSuccess("")
    setEditingVehicle(null)
  }

  const validateForm = () => {
    if (!licensePlate.trim()) {
      setError("Kennzeichen ist erforderlich")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!validateForm()) return

    setSubmitting(true)

    try {
      if (editingVehicle) {
        // Fahrzeug bearbeiten
        const { error } = await supabase
          .from("vehicles")
          .update({
            license_plate: licensePlate.trim(),
            brand: brand.trim() || null,
            model: model.trim() || null,
            konzession: konzession.trim() || null,
          })
          .eq("id", editingVehicle.id)

        if (error) throw error
        setSuccess(`Fahrzeug "${licensePlate}" wurde erfolgreich aktualisiert`)
        setShowEditDialog(false)
      } else {
        // Neues Fahrzeug erstellen
        const { error } = await supabase.from("vehicles").insert({
          license_plate: licensePlate.trim(),
          brand: brand.trim() || null,
          model: model.trim() || null,
          konzession: konzession.trim() || null,
          is_active: true,
        })

        if (error) {
          if (error.code === "23505") {
            throw new Error("Kennzeichen bereits vorhanden")
          }
          throw error
        }

        setSuccess(`Fahrzeug "${licensePlate}" wurde erfolgreich erstellt`)
        setShowAddDialog(false)
      }

      resetForm()
      loadVehicles()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern des Fahrzeugs")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleVehicleStatus = async (vehicleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("vehicles").update({ is_active: !currentStatus }).eq("id", vehicleId)

      if (error) throw error

      setVehicles(
        vehicles.map((vehicle) => (vehicle.id === vehicleId ? { ...vehicle, is_active: !currentStatus } : vehicle)),
      )
      setSuccess(`Fahrzeug wurde ${!currentStatus ? "aktiviert" : "deaktiviert"}`)
    } catch (err) {
      setError("Fehler beim Ändern des Fahrzeugstatus")
      console.error(err)
    }
  }

  const deleteVehicle = async (vehicleId: string, licensePlate: string) => {
    if (!confirm(`Möchten Sie das Fahrzeug "${licensePlate}" wirklich löschen?`)) {
      return
    }

    try {
      const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId)

      if (error) throw error

      setVehicles(vehicles.filter((vehicle) => vehicle.id !== vehicleId))
      setSuccess(`Fahrzeug "${licensePlate}" wurde gelöscht`)
    } catch (err) {
      setError("Fehler beim Löschen des Fahrzeugs")
      console.error(err)
    }
  }

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setLicensePlate(vehicle.license_plate)
    setBrand(vehicle.brand || "")
    setModel(vehicle.model || "")
    setKonzession(vehicle.konzession || "")
    setShowEditDialog(true)
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
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Car className="h-6 w-6 text-blue-600" />
              <h1 className="font-semibold text-gray-900">Fahrzeugverwaltung</h1>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Fahrzeug hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Neues Fahrzeug hinzufügen</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="licensePlate">Kennzeichen *</Label>
                    <Input
                      id="licensePlate"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      disabled={submitting}
                      placeholder="z.B. B-MW 1234"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brand">Marke (optional)</Label>
                    <Input
                      id="brand"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      disabled={submitting}
                      placeholder="z.B. BMW"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Modell (optional)</Label>
                    <Input
                      id="model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      disabled={submitting}
                      placeholder="z.B. 3er"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="konzession">Konzession (optional)</Label>
                    <Input
                      id="konzession"
                      value={konzession}
                      onChange={(e) => setKonzession(e.target.value)}
                      disabled={submitting}
                      placeholder="z.B. K001"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                      disabled={submitting}
                      className="flex-1"
                    >
                      Abbrechen
                    </Button>
                    <Button type="submit" disabled={submitting} className="flex-1">
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Erstellen...
                        </>
                      ) : (
                        "Erstellen"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4">
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Fahrzeuge ({vehicles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kennzeichen</TableHead>
                      <TableHead>Marke</TableHead>
                      <TableHead>Modell</TableHead>
                      <TableHead>Konzession</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erstellt</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.license_plate}</TableCell>
                        <TableCell>{vehicle.brand || "-"}</TableCell>
                        <TableCell>{vehicle.model || "-"}</TableCell>
                        <TableCell>
                          {vehicle.konzession ? <Badge variant="outline">{vehicle.konzession}</Badge> : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={vehicle.is_active ? "default" : "destructive"}>
                            {vehicle.is_active ? "Aktiv" : "Inaktiv"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(vehicle.created_at).toLocaleDateString("de-DE")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(vehicle)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleVehicleStatus(vehicle.id, vehicle.is_active)}
                            >
                              {vehicle.is_active ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteVehicle(vehicle.id, vehicle.license_plate)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Fahrzeug bearbeiten</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="editLicensePlate">Kennzeichen *</Label>
                <Input
                  id="editLicensePlate"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editBrand">Marke (optional)</Label>
                <Input id="editBrand" value={brand} onChange={(e) => setBrand(e.target.value)} disabled={submitting} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editModel">Modell (optional)</Label>
                <Input id="editModel" value={model} onChange={(e) => setModel(e.target.value)} disabled={submitting} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editKonzession">Konzession (optional)</Label>
                <Input
                  id="editKonzession"
                  value={konzession}
                  onChange={(e) => setKonzession(e.target.value)}
                  disabled={submitting}
                  placeholder="z.B. K001"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  disabled={submitting}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    "Speichern"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  )
}
