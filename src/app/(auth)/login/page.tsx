import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage () {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Suspense fallback={<div className="text-sm text-text-muted">Carregando...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
