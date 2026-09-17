export const dynamic = "force-dynamic";

export default function DodoSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f5] px-4">
      <section className="max-w-md rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-sm font-semibold tracking-[0.2em] text-emerald-700">AVORLIO</p>
        <h1 className="mt-6 text-2xl font-semibold">Payment received</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">We&apos;re confirming your subscription. Your onboarding link will become available after the verified subscription webhook is processed.</p>
      </section>
    </main>
  );
}

