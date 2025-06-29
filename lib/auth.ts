import { supabase } from "./supabase"

export interface User {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  role: "fahrer" | "admin"
  is_active: boolean
}

export async function signIn(username: string, password: string) {
  try {
    // Debug: Benutzer in unserer users Tabelle finden
    console.log("Searching for username:", username)

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("is_active", true)
      .single()

    console.log("User data found:", userData)
    console.log("User error:", userError)

    if (userError || !userData) {
      throw new Error("Benutzername nicht gefunden")
    }

    // Mit der E-Mail aus der users Tabelle bei Supabase Auth anmelden
    console.log("Attempting auth with email:", userData.email)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: password,
    })

    console.log("Auth data:", authData)
    console.log("Auth error:", authError)

    if (authError) {
      console.error("Auth error details:", authError)
      throw new Error("Passwort ungültig")
    }

    if (!authData.session) {
      throw new Error("Keine Session erstellt")
    }

    return { user: userData, session: authData.session }
  } catch (error) {
    console.error("SignIn error:", error)
    throw error
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const { data: userData, error } = await supabase.from("users").select("*").eq("id", session.user.id).single()

  if (error || !userData) return null

  return userData
}

export async function createUser(userData: {
  email: string
  username: string
  first_name: string
  last_name: string
  role: "fahrer" | "admin"
  password: string
}) {
  // Erst Supabase Auth User erstellen
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
  })

  if (authError) throw authError

  if (!authData.user) throw new Error("Benutzer konnte nicht erstellt werden")

  // Dann Profil in users Tabelle erstellen
  const { data: profileData, error: profileError } = await supabase
    .from("users")
    .insert({
      id: authData.user.id,
      email: userData.email,
      username: userData.username,
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role,
    })
    .select()
    .single()

  if (profileError) {
    // Cleanup: Auth User löschen falls Profil-Erstellung fehlschlägt
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw profileError
  }

  return profileData
}
