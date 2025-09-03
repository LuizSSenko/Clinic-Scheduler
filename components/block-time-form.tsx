"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { createBlockedTime } from "@/lib/actions"
import { useLanguage } from "@/lib/language-context"
import { Label } from "@/components/ui/label"

interface FormData {
  date: Date | null
  startTime: string
  endTime: string
  reason: string
}

interface FormErrors {
  date?: string
  startTime?: string
  endTime?: string
  reason?: string
}

export function BlockTimeForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t } = useLanguage()
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    date: null,
    startTime: "",
    endTime: "",
    reason: "",
  })

  const [errors, setErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.date) {
      newErrors.date = "Please select a date"
    } else {
      // Validate that the selected date is not in the past
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (formData.date < today) {
        newErrors.date = "Cannot block time in the past. Please select a future date."
      }
    }

    if (!formData.startTime) {
      newErrors.startTime = "Please select a start time"
    }

    if (!formData.endTime) {
      newErrors.endTime = "Please select an end time"
    }

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = "End time must be after start time"
    }

    if (!formData.reason.trim()) {
      newErrors.reason = "Reason is required"
    } else if (formData.reason.trim().length < 5) {
      newErrors.reason = "Reason must be at least 5 characters"
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

    setIsSubmitting(true)

    try {
      const submitFormData = new FormData()
      submitFormData.append("date", format(formData.date, "yyyy-MM-dd"))
      submitFormData.append("startTime", formData.startTime)
      submitFormData.append("endTime", formData.endTime)
      submitFormData.append("reason", formData.reason)

      const result = await createBlockedTime(submitFormData)

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

        // Reset form
        setFormData({
          date: null,
          startTime: "",
          endTime: "",
          reason: "",
        })
        setErrors({})

        router.refresh()
      }
    } catch (error) {
      console.error("Error blocking time:", error)
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

  // Generate time slots from 9 AM to 5 PM
  const timeSlots = []
  for (let hour = 9; hour < 17; hour++) {
    const hourFormatted = hour.toString().padStart(2, "0")
    timeSlots.push(`${hourFormatted}:00`)
    timeSlots.push(`${hourFormatted}:30`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-2">
        <Label>{t("blockTime.date")}</Label>
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
            <Calendar
              mode="single"
              selected={formData.date || undefined}
              onSelect={(date) => {
                if (date) {
                  updateFormData("date", date)
                  setDatePickerOpen(false)
                }
              }}
              disabled={(date) => {
                // Disable past dates
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                return date < today
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <p className="text-sm text-muted-foreground">{t("blockTime.date.description")}</p>
        {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("blockTime.startTime")}</Label>
          <Select value={formData.startTime} onValueChange={(value) => updateFormData("startTime", value)}>
            <SelectTrigger className={errors.startTime ? "border-red-500" : ""}>
              <SelectValue placeholder={t("blockTime.startTime")} />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.startTime && <p className="text-sm text-red-500">{errors.startTime}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t("blockTime.endTime")}</Label>
          <Select value={formData.endTime} onValueChange={(value) => updateFormData("endTime", value)}>
            <SelectTrigger className={errors.endTime ? "border-red-500" : ""}>
              <SelectValue placeholder={t("blockTime.endTime")} />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.endTime && <p className="text-sm text-red-500">{errors.endTime}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">{t("blockTime.reason")}</Label>
        <Textarea
          id="reason"
          placeholder={t("blockTime.reason")}
          className={cn("resize-none", errors.reason && "border-red-500")}
          value={formData.reason}
          onChange={(e) => updateFormData("reason", e.target.value)}
        />
        {errors.reason && <p className="text-sm text-red-500">{errors.reason}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("blockTime.submitting") : t("blockTime.submit")}
      </Button>
    </form>
  )
}
