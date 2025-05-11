"use client"

import { Header } from "@/components/header"
import { AppointmentForm } from "@/components/appointment-form"
import { useLanguage } from "@/lib/language-context"

// Ensure the page is not statically generated
export const dynamic = "force-dynamic"

export default function Home() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">{t("bookAppointment.title")}</h1>
        <div className="max-w-2xl mx-auto">
          <AppointmentForm />
        </div>
      </main>
    </div>
  )
}
