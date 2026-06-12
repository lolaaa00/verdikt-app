export default function Loading() {
  return (
    <div className="pt-16 min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-lime border-t-transparent animate-spin mx-auto" />
        <p className="text-muted text-xs font-mono">Loading…</p>
      </div>
    </div>
  );
}
