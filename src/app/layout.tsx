import type { Metadata } from "next"
import { Noto_Sans_JP, JetBrains_Mono } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { ThemeProvider } from "next-themes"
import { Toaster } from "sonner"
import "./globals.css"
import { QueryProvider } from "@/lib/providers/query-provider"

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: false,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "AI Content Studio",
  description: "Japanese-market advertising campaign kit generator",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`dark ${notoSansJP.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-bg-page text-text-primary font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <QueryProvider>
              {children}
              <Toaster
                theme="dark"
                position="top-right"
                toastOptions={{
                  style: {
                    background: "#141414",
                    border: "1px solid #2A2A2A",
                    color: "#FFFFFF",
                  },
                }}
              />
            </QueryProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
