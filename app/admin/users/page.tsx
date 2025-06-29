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
import { createUser } from "@/lib/simple-auth"
import type { User } from "@/lib/simple-auth"
import { ArrowLeft, Plus, Users, Loader2, CheckCircle, XCircle, Edit, Trash2 } from "lucide-react"

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Form states
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"fahrer" | "admin">("fahrer")

  const router = useRouter()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*").order("first_name")

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      setError("Fehler beim Laden der Benutzer")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFirstName("")
    setLastName("")
    setUsername("")
    setPassword("")
    setRole("fahrer")
    setError("")
    setSuccess("")
    setEditingUser(null)
  }

  const validateForm = () => {
    if (!firstName.trim()) {
      setError("Vorname ist erforderlich")
      return false
    }
    if (!lastName.trim()) {
      setError("Nachname ist erforderlich")
      return false
    }
    if (!username.trim()) {
      setError("Benutzername ist erforderlich")
      return false
    }
    // Passwort nur bei neuen Benutzern erforderlich
    if (!editingUser && (!password.trim() || password.length < 3)) {
      setError("Passwort muss mindestens 3 Zeichen lang sein")
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
      if (editingUser) {
        // Benutzer bearbeiten
        const updateData: any = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim(),
          role,
        }

        // Passwort nur aktualisieren wenn eingegeben
        if (password.trim()) {
          updateData.password_hash = password
        }

        const { error } = await supabase.from("users").update(updateData).eq("id", editingUser.id)

        if (error) throw error
        setSuccess(`Benutzer "${username}" wurde erfolgreich aktualisiert`)
        setShowEditDialog(false)
      } else {
        // Neuen Benutzer erstellen
        await createUser({
          username: username.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role,
          password,
        })

        setSuccess(`Benutzer "${username}" wurde erfolgreich erstellt`)
        setShowAddDialog(false)
      }

      resetForm()
      loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern des Benutzers")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("users").update({ is_active: !currentStatus }).eq("id", userId)

      if (error) throw error

      setUsers(users.map((user) => (user.id === userId ? { ...user, is_active: !currentStatus } : user)))
    } catch (err) {
      setError("Fehler beim Ändern des Benutzerstatus")
      console.error(err)
    }
  }

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Möchten Sie den Benutzer "${username}" wirklich löschen?`)) {
      return
    }

    try {
      const { error } = await supabase.from("users").delete().eq("id", userId)

      if (error) throw error

      setUsers(users.filter((user) => user.id !== userId))
      setSuccess(`Benutzer "${username}" wurde gelöscht`)
    } catch (err) {
      setError("Fehler beim Löschen des Benutzers")
      console.error(err)
    }
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setFirstName(user.first_name)
    setLastName(user.last_name)
    setUsername(user.username)
    setPassword("")
    setRole(user.role)
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
              <Users className="h-6 w-6 text-blue-600" />
              <h1 className="font-semibold text-gray-900">Benutzerverwaltung</h1>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Benutzer hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Neuen Benutzer hinzufügen</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Vorname *</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nachname *</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Benutzername *</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={submitting}
                      placeholder="z.B. fahrer2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Passwort *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                      placeholder="Mindestens 3 Zeichen"
                    />
                  </div>

                  {/* Rolle als Radio Buttons */}
                  <div className="space-y-2">
                    <Label>Rolle *</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="role"
                          value="fahrer"
                          checked={role === "fahrer"}
                          onChange={(e) => setRole(e.target.value as "fahrer" | "admin")}
                          disabled={submitting}
                        />
                        <span>Fahrer</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="role"
                          value="admin"
                          checked={role === "admin"}
                          onChange={(e) => setRole(e.target.value as "fahrer" | "admin")}
                          disabled={submitting}
                        />
                        <span>Administrator</span>
                      </label>
                    </div>
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
              <CardTitle>Benutzer ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Benutzername</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erstellt</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role === "admin" ? "Administrator" : "Fahrer"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "default" : "destructive"}>
                            {user.is_active ? "Aktiv" : "Inaktiv"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString("de-DE")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleUserStatus(user.id, user.is_active)}
                            >
                              {user.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteUser(user.id, user.username)}
                              disabled={user.role === "admin"} // Admins können nicht gelöscht werden
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
              <DialogTitle>Benutzer bearbeiten</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">Vorname *</Label>
                  <Input
                    id="editFirstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName">Nachname *</Label>
                  <Input
                    id="editLastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editUsername">Benutzername *</Label>
                <Input
                  id="editUsername"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPassword">Neues Passwort (leer lassen = nicht ändern)</Label>
                <Input
                  id="editPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  placeholder="Nur eingeben wenn ändern"
                />
              </div>

              <div className="space-y-2">
                <Label>Rolle *</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="editRole"
                      value="fahrer"
                      checked={role === "fahrer"}
                      onChange={(e) => setRole(e.target.value as "fahrer" | "admin")}
                      disabled={submitting}
                    />
                    <span>Fahrer</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="editRole"
                      value="admin"
                      checked={role === "admin"}
                      onChange={(e) => setRole(e.target.value as "fahrer" | "admin")}
                      disabled={submitting}
                    />
                    <span>Administrator</span>
                  </label>
                </div>
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
