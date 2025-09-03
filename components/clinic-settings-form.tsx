"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { getClinicSettings, updateClinicSettings } from "@/lib/actions"

// Add the useLanguage import
import { useLanguage } from "@/lib/language-context"

const formSchema = z.object({
  workHoursStart: z.string().min(1, "Start time is required"),
  workHoursEnd: z.string().min(1, "End time is required"),
  lunchTimeEnabled: z.boolean(),
  lunchTimeStart: z.string().optional(),
  lunchTimeEnd: z.string().optional(),
  maxConcurrentAppointments: z.coerce.number().int().min(1, "Must allow at least 1 concurrent appointment"),
})

// Add the t function to the component
export function ClinicSettingsForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { t } = useLanguage()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workHoursStart: "09:00",
      workHoursEnd: "17:00",
      lunchTimeEnabled: true,
      lunchTimeStart: "12:00",
      lunchTimeEnd: "13:00",
      maxConcurrentAppointments: 1,
    },
  })

  const lunchTimeEnabled = form.watch("lunchTimeEnabled")

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getClinicSettings()
        form.reset({
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
        form.reset({
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
  }, [form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append("workHoursStart", values.workHoursStart)
    formData.append("workHoursEnd", values.workHoursEnd)
    formData.append("lunchTimeEnabled", values.lunchTimeEnabled.toString())

    if (values.lunchTimeEnabled) {
      formData.append("lunchTimeStart", values.lunchTimeStart || "")
      formData.append("lunchTimeEnd", values.lunchTimeEnd || "")
    }

    formData.append("maxConcurrentAppointments", values.maxConcurrentAppointments.toString())

    const result = await updateClinicSettings(formData)

    setIsSubmitting(false)

    if (result.errors) {
      // Handle validation errors
      Object.entries(result.errors).forEach(([key, value]) => {
        form.setError(key as any, {
          type: "manual",
          message: value as string,
        })
      })
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
  }

  if (isLoading) {
    return <div className="text-center py-4">Loading clinic settings...</div>
  }

  // Update the form labels and buttons
  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t("settings.form.workingHours")}</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="workHoursStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("settings.form.startTime")}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workHoursEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("settings.form.endTime")}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t("settings.form.lunchBreak")}</h3>
              <FormField
                control={form.control}
                name="lunchTimeEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t("settings.form.enableLunchBreak")}</FormLabel>
                      <FormDescription>{t("settings.form.enableLunchBreak.description")}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {lunchTimeEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lunchTimeStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("settings.form.startTime")}</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lunchTimeEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("settings.form.endTime")}</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t("settings.form.appointmentCapacity")}</h3>
              <FormField
                control={form.control}
                name="maxConcurrentAppointments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings.form.maxConcurrentAppointments")}</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormDescription>{t("settings.form.maxConcurrentAppointments.description")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("settings.form.saving") : t("settings.form.saveSettings")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
