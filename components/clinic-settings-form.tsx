"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { getClinicSettings, updateClinicSettings } from "@/lib/actions"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/lib/language-context"

interface FormData {
  workHoursStart: string
  workHoursEnd: string
  lunchTimeEnabled: boolean
  lunchTimeStart: string
  lunchTimeEnd: string
  maxConcurrentAppointments: number
}

interface FormErrors {
  workHoursStart?: string
  workHoursEnd?: string
  lunchTimeStart?: string
  lunchTimeEnd?: string
  maxConcurrentAppointments?: string
}

export function ClinicSettingsForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { t } = useLanguage()

  const [formData, setFormData] = useState<FormData>({
    workHoursStart: "09:00",
    workHoursEnd: "17:00",
    lunchTimeEnabled: true,
    lunchTimeStart: "12:00",
    lunchTimeEnd: "13:00",
    maxConcurrentAppointments: 1,
  })

  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getClinicSettings()
        setFormData({
          workHoursStart: settings.workHours.start,
          workHoursEnd: settings.workHours.end,
          lunchTimeEnabled: settings.lunchTime.enabled,
          lunchTimeStart: settings.lunchTime.start,
          lunchTimeEnd: settings.lunchTime.end,
          maxConcurrentAppointments: settings.maxConcurrentAppointments,
        })
        console.log("Loaded clinic settings for form:", settings)
      } catch (error) {
        console.error("Failed to load clinic settings:", error)
        // Use default values if loading fails
        setFormData({
          workHoursStart: "09:00",
          workHoursEnd: "17:00",
          lunchTimeEnabled: true,
          lunchTimeStart: "12:00",
          lunchTimeEnd: "13:00",
          maxConcurrentAppointments: 1,
        })
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Failed to load clinic settings. Using default values.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.workHoursStart) {
      newErrors.workHoursStart = "Start time is required"
    }

    if (!formData.workHoursEnd) {
      newErrors.workHoursEnd = "End time is required"
    }

    if (formData.workHoursStart && formData.workHoursEnd && formData.workHoursStart >= formData.workHoursEnd) {
      newErrors.workHoursEnd = "End time must be after start time"
    }

    if (formData.lunchTimeEnabled) {
      if (!formData.lunchTimeStart) {
        newErrors.lunchTimeStart = "Lunch time start is required"
      }

      if (!formData.lunchTimeEnd) {
        newErrors.lunchTimeEnd = "Lunch time end is required"
      }

      if (formData.lunchTimeStart && formData.lunchTimeEnd && formData.lunchTimeStart >= formData.lunchTimeEnd) {
        newErrors.lunchTimeEnd = "Lunch end time must be after start time"
      }

      if (
        formData.lunchTimeStart &&
        formData.lunchTimeEnd &&
        formData.workHoursStart &&
        formData.workHoursEnd &&
        (formData.lunchTimeStart < formData.workHoursStart || formData.lunchTimeEnd > formData.workHoursEnd)
      ) {
        newErrors.lunchTimeStart = "Lunch time must be within work hours"
        newErrors.lunchTimeEnd = "Lunch time must be within work hours"
      }
    }

    if (formData.maxConcurrentAppointments < 1) {
      newErrors.maxConcurrentAppointments = "Must allow at least 1 concurrent appointment"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const submitFormData = new FormData()
      submitFormData.append("workHoursStart", formData.workHoursStart)
      submitFormData.append("workHoursEnd", formData.workHoursEnd)
      submitFormData.append("lunchTimeEnabled", formData.lunchTimeEnabled.toString())

      if (formData.lunchTimeEnabled) {
        submitFormData.append("lunchTimeStart", formData.lunchTimeStart)
        submitFormData.append("lunchTimeEnd", formData.lunchTimeEnd)
      }

      submitFormData.append("maxConcurrentAppointments", formData.maxConcurrentAppointments.toString())

      const result = await updateClinicSettings(submitFormData)

      if (result.errors) {
        // Handle validation errors
        const newErrors: FormErrors = {}
        Object.entries(result.errors).forEach(([fieldName, messages]) => {
          const messageArray = Array.isArray(messages) ? messages : [messages]
          const message = messageArray[0]

          if (typeof message === "string") {
            newErrors[fieldName as keyof FormErrors] = message
          }
        })
        setErrors(newErrors)

        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        })
      } else {
        toast({
          title: "Success",
          description: result.message,
        })
        router.refresh()
      }
    } catch (error) {
      console.error("Error updating settings:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing/selecting
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  if (isLoading) {
    return <div className="text-center py-4">Loading clinic settings...</div>
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t("settings.form.workingHours")}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workHoursStart">{t("settings.form.startTime")}</Label>
                <Input
                  id="workHoursStart"
                  type="time"
                  value={formData.workHoursStart}
                  onChange={(e) => updateFormData("workHoursStart", e.target.value)}
                  className={errors.workHoursStart ? "border-red-500" : ""}
                />
                {errors.workHoursStart && <p className="text-sm text-red-500">{errors.workHoursStart}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="workHoursEnd">{t("settings.form.endTime")}</Label>
                <Input
                  id="workHoursEnd"
                  type="time"
                  value={formData.workHoursEnd}
                  onChange={(e) => updateFormData("workHoursEnd", e.target.value)}
                  className={errors.workHoursEnd ? "border-red-500" : ""}
                />
                {errors.workHoursEnd && <p className="text-sm text-red-500">{errors.workHoursEnd}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t("settings.form.lunchBreak")}</h3>
            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">{t("settings.form.enableLunchBreak")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.form.enableLunchBreak.description")}</p>
              </div>
              <Switch
                checked={formData.lunchTimeEnabled}
                onCheckedChange={(checked) => updateFormData("lunchTimeEnabled", checked)}
              />
            </div>

            {formData.lunchTimeEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lunchTimeStart">{t("settings.form.startTime")}</Label>
                  <Input
                    id="lunchTimeStart"
                    type="time"
                    value={formData.lunchTimeStart}
                    onChange={(e) => updateFormData("lunchTimeStart", e.target.value)}
                    className={errors.lunchTimeStart ? "border-red-500" : ""}
                  />
                  {errors.lunchTimeStart && <p className="text-sm text-red-500">{errors.lunchTimeStart}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lunchTimeEnd">{t("settings.form.endTime")}</Label>
                  <Input
                    id="lunchTimeEnd"
                    type="time"
                    value={formData.lunchTimeEnd}
                    onChange={(e) => updateFormData("lunchTimeEnd", e.target.value)}
                    className={errors.lunchTimeEnd ? "border-red-500" : ""}
                  />
                  {errors.lunchTimeEnd && <p className="text-sm text-red-500">{errors.lunchTimeEnd}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t("settings.form.appointmentCapacity")}</h3>
            <div className="space-y-2">
              <Label htmlFor="maxConcurrentAppointments">{t("settings.form.maxConcurrentAppointments")}</Label>
              <Input
                id="maxConcurrentAppointments"
                type="number"
                min="1"
                value={formData.maxConcurrentAppointments}
                onChange={(e) => updateFormData("maxConcurrentAppointments", Number.parseInt(e.target.value, 10) || 1)}
                className={errors.maxConcurrentAppointments ? "border-red-500" : ""}
              />
              <p className="text-sm text-muted-foreground">
                {t("settings.form.maxConcurrentAppointments.description")}
              </p>
              {errors.maxConcurrentAppointments && (
                <p className="text-sm text-red-500">{errors.maxConcurrentAppointments}</p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("settings.form.saving") : t("settings.form.saveSettings")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
