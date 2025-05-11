"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CustomGridCalendar } from "./custom-grid-calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { createAppointment, getClinicSettings } from "@/lib/actions"
import type { ClinicSettings } from "@/lib/types"
import { Switch } from "@/components/ui/switch"

// Update the form schema to remove the reason field
const formSchema = z.object({
  userName: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  userEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
  date: z.date({
    required_error: "Please select a date.",
  }),
  time: z.string({
    required_error: "Please select a time.",
  }),
  isEmergency: z.boolean().default(false),
  emergencyReason: z.string().optional(),
})

export function AppointmentForm() {
  // Move useLanguage to the top to ensure consistent hook order
  const { t } = useLanguage()

  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [appointmentCounts, setAppointmentCounts] = useState<Record<string, number>>({})

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userName: "",
      userEmail: "",
      isEmergency: false,
      emergencyReason: "",
    },
  })

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getClinicSettings()
        setClinicSettings(settings)
      } catch (error) {
        console.error("Failed to load clinic settings:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load clinic settings.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Update the onSubmit function to handle the modified form
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append("userName", values.userName)
    formData.append("userEmail", values.userEmail)
    formData.append("date", format(values.date, "yyyy-MM-dd"))
    formData.append("time", values.time)
    formData.append("reason", values.isEmergency && values.emergencyReason ? values.emergencyReason : "General visit")
    formData.append("isEmergency", values.isEmergency.toString())
    if (values.isEmergency && values.emergencyReason) {
      formData.append("emergencyReason", values.emergencyReason)
    }

    const result = await createAppointment(formData)

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
    } else if (result.message && !result.message.includes("successfully")) {
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
      form.reset()
      router.refresh()
    }
  }

  // Generate time slots based on clinic settings
  const generateTimeSlots = () => {
    if (!clinicSettings) return []

    const timeSlots = []
    const { start, end } = clinicSettings.workHours

    // Convert time strings to minutes for easier calculation
    const startMinutes = Number.parseInt(start.split(":")[0]) * 60 + Number.parseInt(start.split(":")[1])
    const endMinutes = Number.parseInt(end.split(":")[0]) * 60 + Number.parseInt(end.split(":")[1])

    // Generate slots in 30-minute intervals
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`

      // Skip lunch time if enabled
      if (clinicSettings.lunchTime.enabled) {
        const lunchStartMinutes =
          Number.parseInt(clinicSettings.lunchTime.start.split(":")[0]) * 60 +
          Number.parseInt(clinicSettings.lunchTime.start.split(":")[1])
        const lunchEndMinutes =
          Number.parseInt(clinicSettings.lunchTime.end.split(":")[0]) * 60 +
          Number.parseInt(clinicSettings.lunchTime.end.split(":")[1])

        if (minutes >= lunchStartMinutes && minutes < lunchEndMinutes) {
          continue
        }
      }

      timeSlots.push(timeString)
    }

    return timeSlots
  }

  const timeSlots = generateTimeSlots()

  if (isLoading) {
    return <div className="text-center py-10">{t("loading.form")}</div>
  }

  // Replace hardcoded text with translation keys
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="userName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("bookAppointment.name")}</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="userEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("bookAppointment.email")}</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("bookAppointment.date")}</FormLabel>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                    >
                      {field.value ? format(field.value, "PPP") : <span>{t("bookAppointment.date.placeholder")}</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CustomGridCalendar
                    appointmentCounts={appointmentCounts}
                    selectedDate={field.value}
                    onDateSelect={(date) => {
                      if (date) {
                        field.onChange(date)
                        setDatePickerOpen(false)
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>{t("bookAppointment.date.description")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("bookAppointment.time")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("bookAppointment.time.placeholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>{t("bookAppointment.time.description")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isEmergency"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t("bookAppointment.isEmergency")}</FormLabel>
                <FormDescription>{t("bookAppointment.isEmergency.description")}</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("isEmergency") && (
          <FormField
            control={form.control}
            name="emergencyReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("bookAppointment.emergencyDetails")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("bookAppointment.emergencyDetails.placeholder")}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("bookAppointment.emergencyDetails.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("bookAppointment.submitting") : t("bookAppointment.submit")}
        </Button>
      </form>
    </Form>
  )
}
