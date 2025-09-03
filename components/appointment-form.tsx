"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, addHours } from "date-fns"
import { CalendarIcon, Clock, AlertCircle } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CustomGridCalendar } from "./custom-grid-calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { createAppointment, getClinicSettings, getAvailableTimeSlots } from "@/lib/actions"
import type { ClinicSettings, TimeSlot } from "@/lib/types"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"

interface FormData {
  userName: string
  userEmail: string
  date: Date | null
  time: string
  isEmergency: boolean
  emergencyReason: string
}

interface FormErrors {
  userName?: string
  userEmail?: string
  date?: string
  time?: string
  emergencyReason?: string
}

export function AppointmentForm() {
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
  const [noTimeSlotsAvailable, setNoTimeSlotsAvailable] = useState(false)

  // Form state
  const [formData, setFormData] = useState<FormData>({
    userName: "",
    userEmail: "",
    date: null,
    time: "",
    isEmergency: false,
    emergencyReason: "",
  })

  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getClinicSettings()
        setClinicSettings(settings)
        console.log("Loaded clinic settings:", settings)
      } catch (error) {
        console.error("Failed to load clinic settings:", error)
        const defaultSettings = {
          workHours: {
            start: "09:00",
            end: "17:00",
          },
          lunchTime: {
            enabled: true,
            start: "12:00",
            end: "13:00",
          },
          maxConcurrentAppointments: 1,
        }
        setClinicSettings(defaultSettings)
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Using default clinic settings. Please check your configuration.",
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
      if (!formData.date) {
        setAvailableTimeSlots([])
        setNoTimeSlotsAvailable(false)
        return
      }

      setIsLoadingTimeSlots(true)
      setNoTimeSlotsAvailable(false)

      try {
        const formattedDate = format(formData.date, "yyyy-MM-dd")
        const slots = await getAvailableTimeSlots(formattedDate)
        setAvailableTimeSlots(slots)

        if (slots.length === 0) {
          setNoTimeSlotsAvailable(true)
        }

        // Reset time selection if the previously selected time is no longer available
        if (formData.time && !slots.some((slot) => slot.time === formData.time)) {
          setFormData((prev) => ({ ...prev, time: "" }))
        }
      } catch (error) {
        console.error("Failed to load available time slots:", error)
        setAvailableTimeSlots([])
        setNoTimeSlotsAvailable(true)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load available time slots.",
        })
      } finally {
        setIsLoadingTimeSlots(false)
      }
    }

    loadAvailableTimeSlots()
  }, [formData.date, formData.time])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.userName.trim()) {
      newErrors.userName = "Name is required"
    } else if (formData.userName.trim().length < 2) {
      newErrors.userName = "Name must be at least 2 characters"
    }

    if (!formData.userEmail.trim()) {
      newErrors.userEmail = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.userEmail)) {
      newErrors.userEmail = "Please enter a valid email address"
    }

    if (!formData.date) {
      newErrors.date = "Please select a date"
    }

    if (!formData.time) {
      newErrors.time = "Please select a time"
    }

    if (formData.isEmergency && !formData.emergencyReason.trim()) {
      newErrors.emergencyReason = "Please describe the emergency"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!formData.date) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a date.",
      })
      return
    }

    // Validate that the selected date is not in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (formData.date < today) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot schedule appointments in the past. Please select a future date.",
      })
      return
    }

    // Check if the selected time is in the past for today's date
    if (formData.date.toDateString() === new Date().toDateString()) {
      const now = new Date()
      const gmt3Now = addHours(now, -3)

      const [hours, minutes] = formData.time.split(":").map(Number)
      const selectedTime = new Date(formData.date)
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
    const isTimeSlotAvailable = availableTimeSlots.some((slot) => slot.time === formData.time)

    if (!isTimeSlotAvailable) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "This time slot is no longer available. Please select another time.",
      })

      // Refresh available time slots
      try {
        const formattedDate = format(formData.date, "yyyy-MM-dd")
        const slots = await getAvailableTimeSlots(formattedDate)
        setAvailableTimeSlots(slots)
      } catch (error) {
        console.error("Failed to refresh time slots:", error)
      }

      return
    }

    setIsSubmitting(true)

    try {
      const submitFormData = new FormData()
      submitFormData.append("userName", formData.userName)
      submitFormData.append("userEmail", formData.userEmail)
      submitFormData.append("date", format(formData.date, "yyyy-MM-dd"))
      submitFormData.append("time", formData.time)
      submitFormData.append("reason", "General visit")
      submitFormData.append("isEmergency", formData.isEmergency.toString())
      submitFormData.append("language", language)
      submitFormData.append("emergencyReason", formData.emergencyReason || "")

      console.log("Calling createAppointment with formData")
      const result = await createAppointment(submitFormData)
      console.log("createAppointment result:", result)

      if (result?.success === false) {
        if (result.errors) {
          // Handle field-specific errors
          const newErrors: FormErrors = {}
          Object.entries(result.errors).forEach(([fieldName, messages]) => {
            const messageArray = Array.isArray(messages) ? messages : [messages]
            const message = messageArray[0]

            if (typeof message === "string") {
              newErrors[fieldName as keyof FormErrors] = message
            }
          })
          setErrors(newErrors)
        }

        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to create appointment.",
        })
      } else if (result?.success === true || result?.message?.includes("successfully")) {
        toast({
          title: "Success",
          description: result.message || "Appointment created successfully!",
        })

        // Reset form
        setFormData({
          userName: "",
          userEmail: "",
          date: null,
          time: "",
          isEmergency: false,
          emergencyReason: "",
        })
        setErrors({})

        setSubmissionComplete(true)

        // Redirect after a delay
        setTimeout(() => {
          router.push("/")
          router.refresh()
        }, 1500)
      } else {
        console.error("Unexpected result structure:", result)
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
        })
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

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
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
        <p className="mt-2 text-sm text-muted-foreground">
          Note: Email confirmation is currently disabled. You can enable it by configuring Mailgun in the settings.
        </p>
        <Button
          onClick={() => {
            setSubmissionComplete(false)
            setFormData({
              userName: "",
              userEmail: "",
              date: null,
              time: "",
              isEmergency: false,
              emergencyReason: "",
            })
            setErrors({})
          }}
        >
          {t("bookAppointment.success.newAppointment")}
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="userName">{t("bookAppointment.name")}</Label>
        <Input
          id="userName"
          placeholder="John Doe"
          value={formData.userName}
          onChange={(e) => updateFormData("userName", e.target.value)}
          className={errors.userName ? "border-red-500" : ""}
        />
        {errors.userName && <p className="text-sm text-red-500">{errors.userName}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="userEmail">{t("bookAppointment.email")}</Label>
        <Input
          id="userEmail"
          type="email"
          placeholder="john@example.com"
          value={formData.userEmail}
          onChange={(e) => updateFormData("userEmail", e.target.value)}
          className={errors.userEmail ? "border-red-500" : ""}
        />
        {errors.userEmail && <p className="text-sm text-red-500">{errors.userEmail}</p>}
      </div>

      <div className="space-y-2">
        <Label>{t("bookAppointment.date")}</Label>
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full pl-3 text-left font-normal",
                !formData.date && "text-muted-foreground",
                errors.date && "border-red-500",
              )}
            >
              {formData.date ? format(formData.date, "PPP") : <span>{t("bookAppointment.date.placeholder")}</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CustomGridCalendar
              appointmentCounts={appointmentCounts}
              selectedDate={formData.date}
              onDateSelect={(date) => {
                if (date) {
                  updateFormData("date", date)
                  setDatePickerOpen(false)
                }
              }}
            />
          </PopoverContent>
        </Popover>
        <p className="text-sm text-muted-foreground">{t("bookAppointment.date.description")}</p>
        {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
      </div>

      {formData.date && noTimeSlotsAvailable && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("bookAppointment.time.noAvailableSlotsTitle")}</AlertTitle>
          <AlertDescription>{t("bookAppointment.time.noAvailableSlotsDescription")}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>{t("bookAppointment.time")}</Label>
        <Select
          value={formData.time}
          onValueChange={(value) => updateFormData("time", value)}
          disabled={!formData.date || isLoadingTimeSlots || noTimeSlotsAvailable}
        >
          <SelectTrigger className={errors.time ? "border-red-500" : ""}>
            <SelectValue
              placeholder={
                isLoadingTimeSlots
                  ? t("bookAppointment.time.loading")
                  : !formData.date
                    ? t("bookAppointment.time.selectDateFirst")
                    : noTimeSlotsAvailable
                      ? t("bookAppointment.time.noAvailableSlots")
                      : t("bookAppointment.time.placeholder")
              }
            />
          </SelectTrigger>
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
                <SelectItem key={slot.time} value={slot.time}>
                  <div className="flex items-center justify-between w-full">
                    <span>{slot.time}</span>
                    {slot.remainingSlots !== undefined && slot.remainingSlots <= 2 && (
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
        <p className="text-sm text-muted-foreground">{t("bookAppointment.time.description")}</p>
        {errors.time && <p className="text-sm text-red-500">{errors.time}</p>}
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">{t("bookAppointment.isEmergency")}</Label>
          <p className="text-sm text-muted-foreground">{t("bookAppointment.isEmergency.description")}</p>
        </div>
        <Switch checked={formData.isEmergency} onCheckedChange={(checked) => updateFormData("isEmergency", checked)} />
      </div>

      {formData.isEmergency && (
        <div className="space-y-2">
          <Label htmlFor="emergencyReason">{t("bookAppointment.emergencyDetails")}</Label>
          <Textarea
            id="emergencyReason"
            placeholder={t("bookAppointment.emergencyDetails.placeholder")}
            className={cn("resize-none", errors.emergencyReason && "border-red-500")}
            value={formData.emergencyReason}
            onChange={(e) => updateFormData("emergencyReason", e.target.value)}
          />
          <p className="text-sm text-muted-foreground">{t("bookAppointment.emergencyDetails.description")}</p>
          {errors.emergencyReason && <p className="text-sm text-red-500">{errors.emergencyReason}</p>}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting || !formData.date || !formData.time || noTimeSlotsAvailable}>
        {isSubmitting ? t("bookAppointment.submitting") : t("bookAppointment.submit")}
      </Button>
    </form>
  )
}
