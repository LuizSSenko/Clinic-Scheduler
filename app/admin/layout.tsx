"use client"

import type React from "react"
// Remove the Header import since it's causing duplication
// import { Header } from "@/components/header"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Remove the Header component from here */}
      <div className="flex-1">{children}</div>
    </div>
  )
}
