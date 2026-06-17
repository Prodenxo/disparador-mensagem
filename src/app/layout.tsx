import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { themeInitScript } from '@/lib/theme'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
})

export const metadata = {
  title: 'Disparador de Mensagem',
  description: 'Agende anúncios em grupos WhatsApp'
}

export default function RootLayout ({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.variable}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
