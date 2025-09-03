"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BlockTimeForm } from "@/components/block-time-form"
import { AppointmentsList } from "@/components/appointments-list"
import { BlockedTimesList } from "@/components/blocked-times-list"
import { ClinicSettingsForm } from "@/components/clinic-settings-form"
import { getAppointments } from "@/lib/actions"
import { useLanguage } from "@/lib/language-context"
import { useState, useEffect, useCallback } from "react"
import type { Appointment } from "@/lib/types"
import { Header } from "@/components/header"

// Ensure the page is not statically generated and fetches fresh data on each request
export const dynamic = "force-dynamic"

export default function AdminPage() {
  const { t } = useLanguage()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAppointments = useCallback(async () => {
    try {
      console.log("AdminPage: Fetching appointments...")
      setLoading(true)
      const data = await getAppointments()
      console.log("AdminPage: Appointments fetched:", data)

      if (Array.isArray(data)) {
        setAppointments(data)
        setError(null)
      } else {
        console.error("AdminPage: Invalid appointments data:", data)
        setAppointments([])
        setError("Invalid appointments data received")
      }
    } catch (error) {
      console.error("AdminPage: Error fetching appointments:", error)
      setError(`Error fetching appointments: ${error.message}`)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  // Handle appointment deletion - update local state immediately
  const handleAppointmentDeleted = useCallback((deletedId: string) => {
    console.log(`AdminPage: Handling deletion of appointment ${deletedId}`)
    setAppointments((prevAppointments) => {
      const filtered = prevAppointments.filter((appointment) => appointment.id !== deletedId)
      console.log(`AdminPage: Updated appointments count from ${prevAppointments.length} to ${filtered.length}`)
      return filtered
    })
  }, [])

  // Refresh appointments when tab changes
  const handleTabChange = useCallback(
    (value: string) => {
      if (value === "appointments") {
        console.log("AdminPage: Refreshing appointments due to tab change")
        fetchAppointments()
      }
    },
    [fetchAppointments],
  )

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 container mx-auto py-8 px-4">
          <div className="text-center py-10">{t("loading.appointments")}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">{t("admin.title")}</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <p className="text-sm text-red-600 mt-1">Check the console for more details.</p>
          </div>
        )}

        <Tabs defaultValue="appointments" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="appointments">
              {t("admin.tabs.appointments")}
              {appointments.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                  {appointments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">{t("admin.tabs.settings")}</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="mt-6">
            <AppointmentsList
              appointments={appointments}
              onAppointmentDeleted={handleAppointmentDeleted}
              onRefresh={fetchAppointments}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-8">
              {/* Clinic Settings Form */}
              <div className="max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold mb-4">{t("settings.general")}</h2>
                <ClinicSettingsForm />
              </div>

              {/* Block Time Form */}
              <div className="max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold mb-4">{t("settings.blockTime")}</h2>
                <BlockTimeForm />
              </div>

              {/* Blocked Times List */}
              <div>
                <h2 className="text-xl font-semibold mb-4">{t("settings.blockedTimes")}</h2>
                <BlockedTimesList />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
