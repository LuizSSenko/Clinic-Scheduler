"use client"

import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        className={`w-10 h-8 p-0 ${language === "en" ? "bg-gray-200" : ""}`}
        onClick={() => setLanguage("en")}
        aria-label="Switch to English"
      >
        <div
          className="w-6 h-4"
          dangerouslySetInnerHTML={{
            __html: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
            <path fill="#bd3d44" d="M0 0h640v480H0"/>
            <path stroke="#fff" strokeWidth="37" d="M0 55.3h640M0 129h640M0 203h640M0 277h640M0 351h640M0 425h640"/>
            <path fill="#192f5d" d="M0 0h364.8v258.5H0"/>
            <marker id="us-a" markerHeight="30" markerWidth="30">
              <path fill="#fff" d="m14 0 9 27L0 10h28L5 27z"/>
            </marker>
            <path fill="none" markerMid="url(#us-a)" d="m0 0 16 11h61 61 61 61 60L47 37h61 61 60 61L16 63h61 61 61 61 60L47 89h61 61 60 61L16 115h61 61 61 61 60L47 141h61 61 60 61L16 166h61 61 61 61 60L47 192h61 61 60 61L16 218h61 61 61 61 60z"/>
          </svg>
        `,
          }}
        />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`w-10 h-8 p-0 ${language === "pt-BR" ? "bg-gray-200" : ""}`}
        onClick={() => setLanguage("pt-BR")}
        aria-label="Switch to Portuguese (Brazil)"
      >
        <div
          className="w-6 h-4"
          dangerouslySetInnerHTML={{
            __html: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
            <g strokeWidth="1pt">
              <path fill="#229e45" fillRule="evenodd" d="M0 0h640v480H0z"/>
              <path fill="#f8e509" fillRule="evenodd" d="M321.4 436l301.5-195.7L319.6 44 17.1 240.7 321.4 436z"/>
              <path fill="#2b49a3" fillRule="evenodd" d="M452.8 240c0 70.3-57.1 127.3-127.6 127.3A127.4 127.4 0 1 1 452.8 240z"/>
              <path fill="#ffffef" fillRule="evenodd" d="M283.3 316.3l-4-2.3-4 2 .9-4.5-3.2-3.4 4.5-.6 2.2-4 1.9 4.2 4.4.8-3.3 3m-13.3 24.3l-3.9-2.3-4 2 .8-4.5-3.1-3.3 4.5-.6 2.1-4.1 2 4.2 4.4.8-3.4 3.1m-21.6 13.5l-4-2.2-4 2 .9-4.6-3.3-3.3 4.6-.6 2-4 2 4.2 4.4.8-3.3 3.1m-13.1-15.7l-4-2.3-4 2 1-4.5-3.2-3.3 4.5-.6 2.1-4.1 2 4.2 4.4.8-3.3 3.1"/>
            </g>
          </svg>
        `,
          }}
        />
      </Button>
    </div>
  )
}
