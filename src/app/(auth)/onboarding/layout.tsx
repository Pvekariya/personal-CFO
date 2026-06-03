export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 justify-center">
        <div className="h-2 w-12 rounded-full bg-primary" />
        <div className="h-2 w-12 rounded-full bg-muted" />
      </div>
      {children}
    </div>
  )
}
