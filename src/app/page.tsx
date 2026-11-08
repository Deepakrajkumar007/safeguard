// The SafeGuard server only powers the iPhone app (Gmail scan and text checks under /api).
// There is no website: this page just says so.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-3 p-8 font-sans">
      <h1 className="text-3xl font-bold">SafeGuard</h1>
      <p className="text-lg text-slate-600">
        This server powers the SafeGuard iPhone app: Gmail scam checks and scam-text alerts. There&apos;s no website here.
      </p>
    </main>
  );
}
