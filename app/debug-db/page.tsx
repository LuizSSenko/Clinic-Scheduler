"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, Trash2, RefreshCw } from "lucide-react"

export default function DebugDatabasePage() {
  const [debugData, setDebugData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const debugAppointments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/debug-appointments")
      const result = await response.json()
      setDebugData(result)
    } catch (error) {
      setDebugData({
        success: false,
        message: `Error: ${error.message}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearAppointments = async () => {
    if (!confirm("Are you sure you want to clear ALL appointments? This cannot be undone.")) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/clear-appointments", { method: "POST" })
      const result = await response.json()
      alert(result.message)
      // Refresh debug data
      await debugAppointments()
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Database Debug</h1>
          <p className="text-muted-foreground">Debug and manage your database data</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Appointments Debug
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={debugAppointments} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Debug Appointments
                  </>
                )}
              </Button>
              <Button onClick={clearAppointments} disabled={isLoading} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Appointments
              </Button>
            </div>

            {debugData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status</span>
                  </div>
                  <Badge variant={debugData.success ? "default" : "destructive"}>
                    {debugData.success ? "Success" : "Failed"}
                  </Badge>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm mb-2">
                    <strong>Message:</strong> {debugData.message}
                  </p>

                  {debugData.success && (
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Count:</strong> {debugData.count}
                      </div>

                      {debugData.appointments && debugData.appointments.length > 0 && (
                        <div>
                          <strong>Appointments:</strong>
                          <div className="mt-2 max-h-96 overflow-auto">
                            {debugData.appointments.map((appointment: any, index: number) => (
                              <div key={index} className="p-2 bg-background rounded border mb-2">
                                <div className="text-xs">
                                  <strong>Index {index}:</strong>
                                </div>
                                <pre className="text-xs mt-1 overflow-auto whitespace-pre-wrap">
                                  {JSON.stringify(appointment, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <strong>Raw Data:</strong>
                        <pre className="text-xs mt-1 p-2 bg-background rounded border overflow-auto max-h-48">
                          {JSON.stringify(debugData.rawData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button asChild variant="outline">
            <a href="/admin">Back to Admin</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
