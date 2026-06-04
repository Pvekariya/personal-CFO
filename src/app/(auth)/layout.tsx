import { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Authentication | Personal CFO OS",
    template: "%s | Personal CFO OS",
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground relative overflow-hidden font-sans">
      {/* Dynamic Animated Background Mesh */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse duration-[10000ms]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse duration-[12000ms]" />
      </div>

      {/* Left side Premium Hero Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-16 z-10 border-r border-white/10 dark:border-white/5 bg-gradient-to-b from-card/40 to-background/40 backdrop-blur-3xl relative overflow-hidden">
        {/* Floating Abstract Element */}
        <div className="absolute top-1/4 right-10 w-64 h-64 bg-gradient-to-br from-primary/30 to-purple-500/30 rounded-full blur-[80px] mix-blend-screen animate-pulse" />

        <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-1000">
          <div className="h-12 w-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
            <img src="https://img.icons8.com/ios/50/wallet.png" alt="Logo" className="w-7 h-7 dark:invert" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Personal CFO OS
          </span>
        </div>
        
        <div className="space-y-8 max-w-lg z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-ping" />
            Enterprise-grade Wealth Management
          </div>
          <h1 className="text-6xl font-extrabold tracking-tighter leading-[1.05] bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground">
            Master your wealth with <span className="text-primary">precision.</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium leading-relaxed">
            Institutional-grade analytics, bank-level security, and a relentless AI architecting your financial destiny.
          </p>
          
          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="space-y-2">
              <h3 className="font-bold text-2xl text-foreground">₹10Cr+</h3>
              <p className="text-sm text-muted-foreground">Assets tracked dynamically</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-2xl text-foreground">Zero</h3>
              <p className="text-sm text-muted-foreground">Compromise on security</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground animate-in fade-in duration-1000 delay-500 fill-mode-both">
          <div className="flex -space-x-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-10 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden ring-2 ring-primary/10 shadow-sm transition-transform hover:scale-110">
                <img src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="User" />
              </div>
            ))}
          </div>
          <div className="flex flex-col">
            <span className="text-foreground font-semibold">Join the elite 1%</span>
            <span>Trusted by global wealth managers.</span>
          </div>
        </div>
      </div>

      {/* Right side Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10 bg-gradient-to-tl from-background to-secondary/20">
        <div className="w-full max-w-[420px] bg-card/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-white/10 transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(0,122,255,0.15)] animate-in fade-in zoom-in-95 duration-700">
          {children}
        </div>
      </div>
    </div>
  )
}
