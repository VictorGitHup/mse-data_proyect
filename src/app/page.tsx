export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="space-y-4">
        <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
          Next Starter
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed">
          A clean and stable foundation for your next project, built with Next.js,
          TypeScript, and Tailwind CSS.
        </p>
      </div>
    </main>
  );
}
