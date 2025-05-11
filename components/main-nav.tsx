"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar, Settings } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export function MainNav() {
  const pathname = usePathname()
  const { t } = useLanguage()

  const routes = [
    {
      href: "/",
      label: t("nav.bookAppointment"),
      icon: Calendar,
      active: pathname === "/",
    },
    {
      href: "/admin",
      label: t("nav.admin"),
      icon: Settings,
      active: pathname === "/admin" || pathname.startsWith("/admin"),
    },
  ]

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {routes.map((route) => (
        <Button key={route.href} variant={route.active ? "default" : "ghost"} asChild>
          <Link href={route.href} className="flex items-center">
            <route.icon className="h-4 w-4 mr-2" />
            {route.label}
          </Link>
        </Button>
      ))}
    </nav>
  )
}
