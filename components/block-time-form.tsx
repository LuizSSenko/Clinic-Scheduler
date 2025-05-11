"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { createBlockedTime } from "@/lib/actions"
import { useLanguage } from "@/lib/language-context"

const formSchema = z.object({
  date: z.date({
    required_error: "Please select a date.",
  }),
  startTime: z.string({
    required_error: "Please select a start time.",
  }),
  endTime: z.string({
    required_error: "Please select an end time.",
  }),
  reason: z.string().min(5, {
    message: "Reason must be at least 5 characters.",
  }),
})

export function BlockTimeForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t } = useLanguage()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Validate that end time is after start time
    if (values.startTime >= values.endTime) {
      form.setError("endTime", {
        type: "manual",
        message: "End time must be after start time",
      })
      return
    }

    setIsSubmitting(true)

    const formData = new FormData()
    formData.append("date", format(values.date, "yyyy-MM-dd"))
    formData.append("startTime", values.startTime)
    formData.append("endTime", values.endTime)
    formData.append("reason", values.reason)

    const result = await createBlockedTime(formData)

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
      form.reset()
      router.refresh()
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("blockTime.date")}</FormLabel>
              <Popover>
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
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
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
              <FormDescription>{t("blockTime.date.description")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("blockTime.startTime")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("blockTime.startTime")} />
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("blockTime.endTime")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("blockTime.endTime")} />
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("blockTime.reason")}</FormLabel>
              <FormControl>
                <Textarea placeholder={t("blockTime.reason")} className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("blockTime.submitting") : t("blockTime.submit")}
        </Button>
      </form>
    </Form>
  )
}
