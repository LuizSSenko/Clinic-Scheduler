"use client"

import React, { Suspense, useState, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format, parseISO } from "date-fns"
import { DeleteAppointmentButton } from "./delete-appointment-button"
import { Badge } from "@/components/ui/badge"
import { AppointmentCalendar } from "./appointment-calendar"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Appointment } from "@/lib/types"
import { useLanguage } from "@/lib/language-context"
import { getAppointments } from "@/lib/actions"

interface AppointmentsTableProps {
  appointments: Appointment[]
  selectedDate: Date | undefined
  onAppointmentDeleted: (id: string) => void
}

function AppointmentsTable({ appointments, selectedDate, onAppointmentDeleted }: AppointmentsTableProps) {
  const [expandedAppointment, setExpandedAppointment] = useState<string | null>(null)
  const { t } = useLanguage()

  // Filter appointments based on selected date
  const filteredAppointments = selectedDate
    ? appointments.filter((appointment) => {
        try {
          // Ensure we have a valid date to compare against
          if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
            return false
          }

          // Ensure we have a valid appointment date
          if (!appointment.date) {
            return false
          }

          const appointmentDate = parseISO(appointment.date)

          // Ensure the parsed date is valid
          if (!(appointmentDate instanceof Date) || isNaN(appointmentDate.getTime())) {
            return false
          }

          const selectedYear = selectedDate.getFullYear()
          const selectedMonth = selectedDate.getMonth()
          const selectedDay = selectedDate.getDate()

          return (
            appointmentDate.getFullYear() === selectedYear &&
            appointmentDate.getMonth() === selectedMonth &&
            appointmentDate.getDate() === selectedDay
          )
        } catch (error) {
          console.error("Error comparing dates:", error)
          return false
        }
      })
    : appointments

  if (!filteredAppointments || filteredAppointments.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">
          {selectedDate ? t("appointments.noAppointmentsForDate") : t("appointments.noAppointments")}
        </p>
      </div>
    )
  }

  const toggleExpand = (id: string) => {
    if (expandedAppointment === id) {
      setExpandedAppointment(null)
    } else {
      setExpandedAppointment(id)
    }
  }

  // Responsive design for mobile and desktop
  return (
    <div>
      {/* Desktop view - traditional table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("appointments.table.date")}</TableHead>
              <TableHead>{t("appointments.table.time")}</TableHead>
              <TableHead>{t("appointments.table.patient")}</TableHead>
              <TableHead>{t("appointments.table.email")}</TableHead>
              <TableHead>{t("appointments.table.status")}</TableHead>
              <TableHead>{t("appointments.table.emergency")}</TableHead>
              <TableHead className="text-right">{t("appointments.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAppointments.map((appointment) => (
              <React.Fragment key={appointment.id}>
                <TableRow className="hover:bg-muted/50">
                  <TableCell onClick={() => toggleExpand(appointment.id)} className="cursor-pointer">
                    {(() => {
                      try {
                        if (!appointment.date) return "N/A"
                        const date = parseISO(appointment.date)
                        if (!(date instanceof Date) || isNaN(date.getTime())) {
                          return appointment.date
                        }
                        return format(date, "MMM d, yyyy")
                      } catch (error) {
                        return appointment.date || "N/A"
                      }
                    })()}
                  </TableCell>
                  <TableCell onClick={() => toggleExpand(appointment.id)} className="cursor-pointer">
                    {appointment.time || "N/A"}
                  </TableCell>
                  <TableCell onClick={() => toggleExpand(appointment.id)} className="cursor-pointer">
                    {appointment.userName || "N/A"}
                  </TableCell>
                  <TableCell onClick={() => toggleExpand(appointment.id)} className="cursor-pointer">
                    {appointment.userEmail || "N/A"}
                  </TableCell>
                  <TableCell onClick={() => toggleExpand(appointment.id)} className="cursor-pointer">
                    <span className="capitalize">{appointment.status || "N/A"}</span>
                  </TableCell>
                  <TableCell onClick={() => toggleExpand(appointment.id)} className="cursor-pointer">
                    {appointment.isEmergency ? (
                      <Badge variant="destructive">{t("appointments.emergency.yes")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("appointments.emergency.no")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DeleteAppointmentButton
                      id={appointment.id}
                      onDelete={() => onAppointmentDeleted(appointment.id)}
                    />
                  </TableCell>
                </TableRow>
                {expandedAppointment === appointment.id && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <Card className="m-2 bg-muted/30 border-muted">
                        <CardContent className="p-4 space-y-4">
                          {/* Only show reason if it's not an emergency or if there's no emergency reason */}
                          {(!appointment.isEmergency || !appointment.emergencyReason) && appointment.reason && (
                            <div>
                              <h4 className="font-medium mb-2">{t("appointments.reasonForVisit")}</h4>
                              <p className="whitespace-pre-wrap break-words">{appointment.reason}</p>
                            </div>
                          )}

                          {/* Show emergency details if available */}
                          {appointment.isEmergency && appointment.emergencyReason && (
                            <div>
                              <h4 className="font-medium mb-2">{t("appointments.emergencyDetails")}</h4>
                              <p className="whitespace-pre-wrap break-words">{appointment.emergencyReason}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view - card-based layout */}
      <div className="md:hidden space-y-4">
        {filteredAppointments.map((appointment) => (
          <Card key={appointment.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 flex justify-between items-start">
                <div onClick={() => toggleExpand(appointment.id)} className="cursor-pointer flex-grow">
                  <h3 className="font-medium">{appointment.userName || "N/A"}</h3>
                  <p className="text-sm text-muted-foreground">{appointment.userEmail || "N/A"}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {appointment.isEmergency ? (
                    <Badge variant="destructive">{t("appointments.emergency.yes")}</Badge>
                  ) : (
                    <Badge variant="outline">{t("appointments.emergency.no")}</Badge>
                  )}
                  <DeleteAppointmentButton id={appointment.id} onDelete={() => onAppointmentDeleted(appointment.id)} />
                </div>
              </div>

              <div
                onClick={() => toggleExpand(appointment.id)}
                className="px-4 pb-3 grid grid-cols-2 gap-2 text-sm cursor-pointer"
              >
                <div>
                  <span className="font-medium">{t("appointments.table.date")}: </span>
                  {(() => {
                    try {
                      if (!appointment.date) return "N/A"
                      const date = parseISO(appointment.date)
                      if (!(date instanceof Date) || isNaN(date.getTime())) {
                        return appointment.date
                      }
                      return format(date, "MMM d, yyyy")
                    } catch (error) {
                      return appointment.date || "N/A"
                    }
                  })()}
                </div>
                <div>
                  <span className="font-medium">{t("appointments.table.time")}: </span>
                  {appointment.time || "N/A"}
                </div>
                <div>
                  <span className="font-medium">{t("appointments.table.status")}: </span>
                  <span className="capitalize">{appointment.status || "N/A"}</span>
                </div>
              </div>

              <Button
                variant="ghost"
                className="w-full flex items-center justify-center py-2 border-t"
                onClick={() => toggleExpand(appointment.id)}
              >
                {expandedAppointment === appointment.id ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" /> {t("appointments.hideDetails")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" /> {t("appointments.showDetails")}
                  </>
                )}
              </Button>

              {expandedAppointment === appointment.id && (
                <div className="p-4 border-t bg-muted/30">
                  {/* Only show reason if it's not an emergency or if there's no emergency reason */}
                  {(!appointment.isEmergency || !appointment.emergencyReason) && appointment.reason && (
                    <div className="mb-3">
                      <h4 className="font-medium mb-1">{t("appointments.reasonForVisit")}</h4>
                      <p className="whitespace-pre-wrap break-words text-sm">{appointment.reason}</p>
                    </div>
                  )}

                  {/* Show emergency details if available */}
                  {appointment.isEmergency && appointment.emergencyReason && (
                    <div>
                      <h4 className="font-medium mb-1">{t("appointments.emergencyDetails")}</h4>
                      <p className="whitespace-pre-wrap break-words text-sm">{appointment.emergencyReason}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function AppointmentsList({ appointments: initialAppointments }: { appointments: Appointment[] }) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments || [])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useLanguage()

  // Refresh appointments data
  const refreshAppointments = useCallback(async () => {
    setIsLoading(true)
    try {
      const freshAppointments = await getAppointments()
      setAppointments(freshAppointments)
    } catch (error) {
      console.error("Error refreshing appointments:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update local state when an appointment is deleted
  const handleAppointmentDeleted = useCallback((id: string) => {
    console.log(`Handling appointment deletion for ID: ${id}`)
    setAppointments((prevAppointments) => {
      const filtered = prevAppointments.filter((appointment) => appointment.id !== id)
      console.log(`Filtered appointments: ${filtered.length} (was ${prevAppointments.length})`)
      return filtered
    })
  }, [])

  let title = t("appointments.allAppointments")
  if (selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
    try {
      title = t("appointments.forDate").replace("{date}", format(selectedDate, "MMMM d, yyyy"))
    } catch (error) {
      title = t("appointments.filteredAppointments")
      console.error("Error formatting selected date:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h2 className="text-xl font-semibold mb-4">{t("appointments.calendar")}</h2>
          <AppointmentCalendar
            appointments={appointments || []}
            onDateSelect={setSelectedDate}
            selectedDate={selectedDate}
          />
          {selectedDate && (
            <div className="mt-4 text-center">
              <Badge variant="outline" className="cursor-pointer" onClick={() => setSelectedDate(undefined)}>
                {t("appointments.clearSelection")}
              </Badge>
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <Button variant="outline" size="sm" onClick={refreshAppointments} disabled={isLoading}>
              {isLoading ? t("loading.appointments") : t("appointments.refresh")}
            </Button>
          </div>
          <div className="rounded-md border">
            <Suspense fallback={<div className="p-4">{t("loading.appointments")}</div>}>
              <AppointmentsTable
                appointments={appointments || []}
                selectedDate={selectedDate}
                onAppointmentDeleted={handleAppointmentDeleted}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
