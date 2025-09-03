"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Database, RefreshCw } from "lucide-react"
import Link from "next/link"

interface DatabaseStatus {
  success: boolean
  message: string
  data?: {
    appointments: number
    blockedTimes: number
    settingsExist: boolean
    settings?: any
  }
}

export default function VerifyDatabasePage() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkDatabase = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/verify-db")
      const result = await response.json()
      setStatus(result)
    } catch (error) {
      setStatus({
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkDatabase()
  }, [])

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Database Verification</h1>
          <p className="text-muted-foreground">Verify your new KV database connection and data</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={checkDatabase} disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Check Database
                  </>
                )}
              </Button>
            </div>

            {status && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {status.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">Connection Status</span>
                  </div>
                  <Badge variant={status.success ? "default" : "destructive"}>
                    {status.success ? "Connected" : "Failed"}
                  </Badge>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm mb-2">
                    <strong>Message:</strong> {status.message}
                  </p>

                  {status.success && status.data && (
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <strong>Appointments:</strong> {status.data.appointments}
                        </div>
                        <div>
                          <strong>Blocked Times:</strong> {status.data.blockedTimes}
                        </div>
                      </div>

                      <div>
                        <strong>Clinic Settings:</strong> {status.data.settingsExist ? "✅ Configured" : "❌ Not set"}
                      </div>

                      {status.data.settings && (
                        <div className="mt-2 p-2 bg-background rounded border">
                          <strong>Current Settings:</strong>
                          <pre className="text-xs mt-1 overflow-auto">
                            {JSON.stringify(status.data.settings, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {status.success ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Database is ready!</span>
                    </div>
                    <p className="text-sm text-green-700 mb-3">Your new database is connected and working properly.</p>
                    <div className="flex gap-2">
                      <Button asChild size="sm">
                        <Link href="/">Go to Clinic Scheduler</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/admin">Admin Dashboard</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 mb-2">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">Connection failed</span>
                    </div>
                    <p className="text-sm text-red-700">
                      Please check your environment variables and database configuration.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Variables Check</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>KV_REST_API_URL:</span>
                <Badge variant="outline">Check Server</Badge>
              </div>
              <div className="flex justify-between">
                <span>KV_REST_API_TOKEN:</span>
                <Badge variant="outline">Check Server</Badge>
              </div>
              <div className="flex justify-between">
                <span>KV_REST_API_READ_ONLY_TOKEN:</span>
                <Badge variant="outline">Check Server</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
