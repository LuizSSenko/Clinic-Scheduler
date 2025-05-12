"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getBlockedTimes } from "@/lib/actions"
import { format, parseISO } from "date-fns"
import { DeleteBlockedTimeButton } from "./delete-blocked-time-button"
import { useLanguage } from "@/lib/language-context"
import type { BlockedTime } from "@/lib/types"

// Add dynamic flag to ensure fresh data
export const dynamic = "force-dynamic"

function BlockedTimesTable() {
  const { t } = useLanguage()
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBlockedTimes() {
      try {
        const data = await getBlockedTimes()
        setBlockedTimes(data)
      } catch (error) {
        console.error("Error fetching blocked times:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBlockedTimes()
  }, [])

  const handleBlockedTimeDeleted = useCallback((id: string) => {
    setBlockedTimes((prevBlockedTimes) => prevBlockedTimes.filter((blockedTime) => blockedTime.id !== id))
  }, [])

  if (loading) {
    return <div className="p-4">{t("loading.blockedTimes")}</div>
  }

  if (!blockedTimes || blockedTimes.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">{t("blockedTimes.noBlockedTimes")}</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("blockedTimes.table.date")}</TableHead>
          <TableHead>{t("blockedTimes.table.startTime")}</TableHead>
          <TableHead>{t("blockedTimes.table.endTime")}</TableHead>
          <TableHead>{t("blockedTimes.table.reason")}</TableHead>
          <TableHead className="text-right">{t("blockedTimes.table.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {blockedTimes.map((blockedTime) => (
          <TableRow key={blockedTime.id}>
            <TableCell>
              {(() => {
                try {
                  if (!blockedTime.date) return "N/A"
                  const date = parseISO(blockedTime.date)
                  if (!(date instanceof Date) || isNaN(date.getTime())) {
                    return blockedTime.date
                  }
                  return format(date, "MMM d, yyyy")
                } catch (error) {
                  return blockedTime.date || "N/A"
                }
              })()}
            </TableCell>
            <TableCell>{blockedTime.startTime || "N/A"}</TableCell>
            <TableCell>{blockedTime.endTime || "N/A"}</TableCell>
            <TableCell className="max-w-xs">
              <div className="whitespace-pre-wrap break-words">{blockedTime.reason || "N/A"}</div>
            </TableCell>
            <TableCell className="text-right">
              <DeleteBlockedTimeButton id={blockedTime.id} onDelete={() => handleBlockedTimeDeleted(blockedTime.id)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function BlockedTimesList() {
  const { t } = useLanguage()

  return (
    <div className="rounded-md border">
      <Suspense fallback={<div className="p-4">{t("loading.blockedTimes")}</div>}>
        <BlockedTimesTable />
      </Suspense>
    </div>
  )
}
