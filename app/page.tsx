"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { AppointmentForm } from "@/components/appointment-form"
import { useLanguage } from "@/lib/language-context"
import { Loader2 } from "lucide-react"

// Ensure the page is not statically generated
export const dynamic = "force-dynamic"

export default function Home() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate a short loading time to ensure components are ready
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">{t("bookAppointment.title")}</h1>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <AppointmentForm />
          </div>
        )}
      </main>
    </div>
  )
}
