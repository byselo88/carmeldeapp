export interface Vehicle {
  id: string
  license_plate: string
  brand?: string
  model?: string
  is_active: boolean
  created_at: string
}

export interface VehicleReport {
  id: string
  user_id: string
  vehicle_id: string
  license_plate: string
  mileage: number
  notes?: string
  report_date: string
  report_time: string
  created_at: string
  user?: {
    first_name: string
    last_name: string
  }
  photos?: ReportPhoto[]
}

export interface ReportPhoto {
  id: string
  report_id: string
  photo_url: string
  photo_type: "vorne_links" | "vorne_rechts" | "hinten_links" | "hinten_rechts" | "optional"
  is_required: boolean
  created_at: string
}

export interface CreateReportData {
  vehicle_id: string
  license_plate: string
  mileage: number
  notes?: string
  photos: {
    file: File
    type: "vorne_links" | "vorne_rechts" | "hinten_links" | "hinten_rechts" | "optional"
  }[]
}

export interface User {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  role: "fahrer" | "admin"
  is_active: boolean
}
