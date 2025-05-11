"use client"

import { MainNav } from "@/components/main-nav"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/lib/language-context"

export function Header() {
  const { t } = useLanguage()

  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-xl">{t("app.title")}</span>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <LanguageSwitcher />
          <MainNav />
        </div>
      </div>
    </header>
  )
}
