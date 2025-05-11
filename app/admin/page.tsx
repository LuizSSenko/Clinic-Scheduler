"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BlockTimeForm } from "@/components/block-time-form"
import { AppointmentsList } from "@/components/appointments-list"
import { BlockedTimesList } from "@/components/blocked-times-list"
import { ClinicSettingsForm } from "@/components/clinic-settings-form"
import { getAppointments } from "@/lib/actions"
import { useLanguage } from "@/lib/language-context"
import { useState, useEffect } from "react"
import type { Appointment } from "@/lib/types"

// Ensure the page is not statically generated and fetches fresh data on each request
export const dynamic = "force-dynamic"

export default function AdminPage() {
  const { t } = useLanguage()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const data = await getAppointments()
        setAppointments(data)
      } catch (error) {
        console.error("Error fetching appointments:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [])

  if (loading) {
    return <div className="text-center py-10">{t("loading.appointments")}</div>
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">{t("admin.title")}</h1>

      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="appointments">{t("admin.tabs.appointments")}</TabsTrigger>
          <TabsTrigger value="settings">{t("admin.tabs.settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-6">
          <AppointmentsList appointments={appointments} />
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
  )
}
