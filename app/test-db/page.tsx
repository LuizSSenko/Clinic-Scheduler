"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Database } from "lucide-react"

export default function TestDatabasePage() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const runTests = async () => {
    setIsLoading(true)
    setTestResults([])

    try {
      // Test KV connection
      const kvTest = await fetch("/api/test-kv", { method: "POST" })
      const kvResult = await kvTest.json()
      setTestResults((prev) => [...prev, { name: "KV Connection", ...kvResult }])

      // Test database initialization
      const initTest = await fetch("/api/init-db", { method: "POST" })
      const initResult = await initTest.json()
      setTestResults((prev) => [...prev, { name: "Database Initialization", ...initResult }])

      // Test clinic settings
      const settingsTest = await fetch("/api/test-settings", { method: "GET" })
      const settingsResult = await settingsTest.json()
      setTestResults((prev) => [...prev, { name: "Clinic Settings", ...settingsResult }])
    } catch (error) {
      console.error("Test error:", error)
      setTestResults((prev) => [
        ...prev,
        {
          name: "Test Suite",
          success: false,
          message: `Test suite error: ${error.message}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Database Connection Test</h1>
          <p className="text-muted-foreground">Test your new KV database connection and initialize default data</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runTests} disabled={isLoading} className="w-full">
              {isLoading ? "Running Tests..." : "Run Database Tests"}
            </Button>

            {testResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Test Results:</h3>
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "Pass" : "Fail"}
                    </Badge>
                  </div>
                ))}

                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Details:</h4>
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm mb-1">
                      <strong>{result.name}:</strong> {result.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {testResults.length > 0 && testResults.every((r) => r.success) && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">All tests passed!</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Your database is ready. You can now use the clinic scheduler normally.
                </p>
                <Button asChild className="mt-3">
                  <a href="/">Go to Clinic Scheduler</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
