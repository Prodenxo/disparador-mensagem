'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import {
  applyTheme,
  getPreferredTheme,
  type ThemeMode
} from '@/lib/theme'

interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider ({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light')

  useEffect(() => {
    const preferred = getPreferredTheme()
    applyTheme(preferred)
    setThemeState(preferred)
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme (nextTheme) {
      applyTheme(nextTheme)
      setThemeState(nextTheme)
    },
    toggleTheme () {
      const nextTheme = theme === 'dark' ? 'light' : 'dark'
      applyTheme(nextTheme)
      setThemeState(nextTheme)
    }
  }), [theme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme (): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  }

  return context
}
