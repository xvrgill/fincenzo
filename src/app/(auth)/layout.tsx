export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
