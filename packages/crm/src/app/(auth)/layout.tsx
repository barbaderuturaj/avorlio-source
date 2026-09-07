export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--primary) 14.00%, transparent) 0%, color-mix(in srgb, var(--primary) 6%, transparent) 28%, transparent 64%)",
        }}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card/95 p-6 shadow-sm backdrop-blur">
        <div className="mb-5 flex justify-center">
          <div className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-sm border-2 border-primary"
            />
            <span>Avorlio</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
