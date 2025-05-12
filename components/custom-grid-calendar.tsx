"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { useLanguage } from "@/lib/language-context"

interface CustomGridCalendarProps {
  appointmentCounts: Record<string, number>
  onDateSelect: (date: Date | undefined) => void
  selectedDate: Date | undefined
}

export function CustomGridCalendar({ appointmentCounts, onDateSelect, selectedDate }: CustomGridCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { language } = useLanguage()

  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const handlePrevMonth = () => {
    // Don't allow navigating to past months if current month is the current month
    const today = new Date()
    const currentMonthStart = startOfMonth(currentMonth)
    const thisMonthStart = startOfMonth(today)

    if (currentMonthStart.getTime() === thisMonthStart.getTime()) {
      return // Don't go back if we're already in the current month
    }

    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleDateClick = (date: Date) => {
    // Don't allow selecting past dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (isBefore(date, today)) {
      return // Don't select past dates
    }

    if (selectedDate && isSameDay(selectedDate, date)) {
      onDateSelect(undefined)
    } else {
      onDateSelect(date)
    }
  }

  // Get all days in the current month
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get day names for header based on the selected language
  const locale = language === "pt-BR" ? ptBR : undefined
  const dayNames =
    language === "pt-BR"
      ? ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  // Calculate the starting day of the week (0 = Sunday, 1 = Monday, etc.)
  const startDay = monthStart.getDay()

  // Create calendar grid with empty cells for days before the start of the month
  const calendarGrid = []

  // Add empty cells for days before the start of the month
  for (let i = 0; i < startDay; i++) {
    calendarGrid.push(null)
  }

  // Add days of the month
  daysInMonth.forEach((day) => {
    calendarGrid.push(day)
  })

  // Add empty cells to complete the grid (if needed)
  const totalCells = Math.ceil(calendarGrid.length / 7) * 7
  while (calendarGrid.length < totalCells) {
    calendarGrid.push(null)
  }

  // Split the grid into weeks
  const weeks = []
  for (let i = 0; i < calendarGrid.length; i += 7) {
    weeks.push(calendarGrid.slice(i, i + 7))
  }

  // Get today's date for comparison
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Card>
      <CardContent className="p-4">
        <div className="calendar">
          {/* Calendar header with month/year and navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevMonth}
              // Disable the previous month button if we're in the current month
              disabled={monthStart.getMonth() === today.getMonth() && monthStart.getFullYear() === today.getFullYear()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-medium">{format(currentMonth, "MMMM yyyy", { locale })}</h2>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day names header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((day, index) => (
              <div key={index} className="aspect-square p-1">
                {day ? (
                  <Button
                    variant={selectedDate && isSameDay(selectedDate, day) ? "default" : "ghost"}
                    className={`relative w-full h-full rounded-md flex items-center justify-center p-0 ${
                      isBefore(day, today) ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() => handleDateClick(day)}
                    disabled={isBefore(day, today)}
                  >
                    <span>{day.getDate()}</span>
                    {appointmentCounts[formatDateToYYYYMMDD(day)] && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                      >
                        {appointmentCounts[formatDateToYYYYMMDD(day)]}
                      </Badge>
                    )}
                  </Button>
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
