
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <main className="flex h-[calc(100vh-80px)] items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <CardTitle className="text-2xl">Algo salió mal</CardTitle>
                <CardDescription>
                    Ocurrió un error inesperado. Puedes intentar recargar la página.
                </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
                <Button onClick={() => reset()}>
                    Intentar de nuevo
                </Button>
            </CardFooter>
        </Card>
    </main>
  )
}
