import { supabase } from "./supabase"

export interface User {
  id: string
  username: string
  first_name: string
  last_name: string
  role: "fahrer" | "admin"
  is_active: boolean
  created_at: string
}

// Einfache Session-Verwaltung im Browser
const SESSION_KEY = "car_app_user"

export async function signIn(username: string, password: string): Promise<{ user: User }> {
  try {
    console.log("Attempting login with:", username)

    // Benutzer in der Datenbank suchen
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("is_active", true)
      .single()

    if (userError || !userData) {
      console.log("User not found:", userError)
      throw new Error("Benutzername nicht gefunden")
    }

    // Passwort prüfen (einfacher Vergleich - in Produktion sollten Sie bcrypt verwenden)
    if (userData.password_hash !== password) {
      console.log("Password mismatch")
      throw new Error("Passwort ungültig")
    }

    // Session im Browser speichern
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData))

    console.log("Login successful for:", userData.username)
    return { user: userData }
  } catch (error) {
    console.error("SignIn error:", error)
    throw error
  }
}

export async function signOut(): Promise<void> {
  localStorage.removeItem(SESSION_KEY)
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY)
    if (!sessionData) return null

    const user = JSON.parse(sessionData)

    // Prüfen ob Benutzer noch aktiv ist
    const { data: currentUserData, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .eq("is_active", true)
      .single()

    if (error || !currentUserData) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }

    return currentUserData
  } catch (error) {
    console.error("getCurrentUser error:", error)
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export async function createUser(userData: {
  username: string
  first_name: string
  last_name: string
  role: "fahrer" | "admin"
  password: string
}): Promise<User> {
  try {
    // Prüfen ob Benutzername bereits existiert
    const { data: existingUser } = await supabase
      .from("users")
      .select("username")
      .eq("username", userData.username)
      .single()

    if (existingUser) {
      throw new Error("Benutzername bereits vergeben")
    }

    // Neuen Benutzer erstellen
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        id: crypto.randomUUID(),
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        password_hash: userData.password, // In Produktion: gehashtes Passwort
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return newUser
  } catch (error) {
    console.error("createUser error:", error)
    throw error
  }
}

// Hilfsfunktion für Passwort-Hashing (für Produktion)
export async function hashPassword(password: string): Promise<string> {
  // Für Entwicklung: einfacher Text
  // Für Produktion: verwenden Sie bcrypt oder ähnliches
  return password
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Für Entwicklung: einfacher Vergleich
  // Für Produktion: verwenden Sie bcrypt.compare()
  return password === hash
}
