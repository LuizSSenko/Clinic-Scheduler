"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format, addHours } from "date-fns"
import { CalendarIcon, Clock } from "lucide-react"
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
import { createAppointment, getClinicSettings, getAvailableTimeSlots } from "@/lib/actions"
import type { ClinicSettings, TimeSlot } from "@/lib/types"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

// Update the form schema to make emergencyReason optional and handle it properly
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
  const { t, language } = useLanguage()

  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [appointmentCounts, setAppointmentCounts] = useState<Record<string, number>>({})
  const [submissionComplete, setSubmissionComplete] = useState(false)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([])
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userName: "",
      userEmail: "",
      isEmergency: false,
      emergencyReason: "",
    },
  })

  // Watch for date changes to update available time slots
  const selectedDate = form.watch("date")

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

  // Update available time slots when date changes
  useEffect(() => {
    async function loadAvailableTimeSlots() {
      if (!selectedDate) return

      setIsLoadingTimeSlots(true)
      try {
        const formattedDate = format(selectedDate, "yyyy-MM-dd")
        const slots = await getAvailableTimeSlots(formattedDate)
        setAvailableTimeSlots(slots)

        // Reset time selection if the previously selected time is no longer available
        const currentTime = form.getValues("time")
        if (currentTime && !slots.some((slot) => slot.time === currentTime && slot.available)) {
          form.setValue("time", "")
        }
      } catch (error) {
        console.error("Failed to load available time slots:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load available time slots.",
        })
      } finally {
        setIsLoadingTimeSlots(false)
      }
    }

    if (selectedDate) {
      loadAvailableTimeSlots()
    }
  }, [selectedDate, form])

  // Update the onSubmit function to handle the emergencyReason field properly
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Validate that the selected date is not in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (values.date < today) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot schedule appointments in the past. Please select a future date.",
      })
      return
    }

    // Check if the selected time is in the past for today's date
    if (values.date.toDateString() === new Date().toDateString()) {
      // Create a date object with GMT-3 timezone offset
      const now = new Date()
      const gmt3Now = addHours(now, -3) // GMT-3 adjustment

      const [hours, minutes] = values.time.split(":").map(Number)
      const selectedTime = new Date(values.date)
      selectedTime.setHours(hours, minutes, 0, 0)

      if (selectedTime < gmt3Now) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Cannot schedule appointments in the past. Please select a future time.",
        })
        return
      }
    }

    // Check if the selected time slot is still available
    const isTimeSlotAvailable = availableTimeSlots.some((slot) => slot.time === values.time && slot.available)

    if (!isTimeSlotAvailable) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "This time slot is no longer available. Please select another time.",
      })
      return
    }

    setIsSubmitting(true)
    setSubmissionComplete(false)

    try {
      const formData = new FormData()
      formData.append("userName", values.userName)
      formData.append("userEmail", values.userEmail)
      formData.append("date", format(values.date, "yyyy-MM-dd"))
      formData.append("time", values.time)
      formData.append("reason", "General visit")
      formData.append("isEmergency", values.isEmergency.toString())

      // Pass the current UI language to the server action
      formData.append("language", language)

      // Only append emergencyReason if it's an emergency and there's a reason provided
      if (values.isEmergency && values.emergencyReason) {
        formData.append("emergencyReason", values.emergencyReason)
      } else {
        // Explicitly set emergencyReason to an empty string to avoid null values
        formData.append("emergencyReason", "")
      }

      const result = await createAppointment(formData)

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
        setSubmissionComplete(true)

        // Use a timeout to allow the toast to be visible before redirecting
        setTimeout(() => {
          router.push("/")
          router.refresh()
        }, 1500)
      }
    } catch (error) {
      console.error("Error creating appointment:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-10">{t("loading.form")}</div>
  }

  if (submissionComplete) {
    return (
      <div className="text-center py-10 space-y-4">
        <h3 className="text-xl font-medium">{t("bookAppointment.success.title")}</h3>
        <p>{t("bookAppointment.success.message")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("bookAppointment.success.emailConfirmation")}</p>
        <Button
          onClick={() => {
            setSubmissionComplete(false)
            form.reset()
          }}
        >
          {t("bookAppointment.success.newAppointment")}
        </Button>
      </div>
    )
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
              <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDate || isLoadingTimeSlots}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingTimeSlots
                          ? t("bookAppointment.time.loading")
                          : !selectedDate
                            ? t("bookAppointment.time.selectDateFirst")
                            : t("bookAppointment.time.placeholder")
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingTimeSlots ? (
                    <div className="flex items-center justify-center py-2">
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      <span>{t("bookAppointment.time.loading")}</span>
                    </div>
                  ) : availableTimeSlots.length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      {t("bookAppointment.time.noAvailableSlots")}
                    </div>
                  ) : (
                    availableTimeSlots.map((slot) => (
                      <SelectItem
                        key={slot.time}
                        value={slot.time}
                        disabled={!slot.available}
                        className={cn(!slot.available && "opacity-50 cursor-not-allowed")}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{slot.time}</span>
                          {!slot.available && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {t("bookAppointment.time.unavailable")}
                            </Badge>
                          )}
                          {slot.available && slot.remainingSlots !== undefined && slot.remainingSlots <= 2 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {slot.remainingSlots === 1
                                ? t("bookAppointment.time.lastSlot")
                                : t("bookAppointment.time.fewSlotsLeft")}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
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
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>{t("bookAppointment.emergencyDetails.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={isSubmitting || !form.getValues("time")}>
          {isSubmitting ? t("bookAppointment.submitting") : t("bookAppointment.submit")}
        </Button>
      </form>
    </Form>
  )
}
