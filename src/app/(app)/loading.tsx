import { TopHeader } from "@/components/shared/TopHeader"

export default function AppLoading() {
  return (
    <div className="flex h-full w-full flex-col p-8 space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200/60 rounded-md"></div>
          <div className="h-4 w-32 bg-slate-200/60 rounded-md"></div>
        </div>
        <div className="h-10 w-10 bg-slate-200/60 rounded-full"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-40 bg-slate-200/60 rounded-xl"></div>
        <div className="h-40 bg-slate-200/60 rounded-xl"></div>
        <div className="h-40 bg-slate-200/60 rounded-xl"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-96 bg-slate-200/60 rounded-xl"></div>
        <div className="h-96 bg-slate-200/60 rounded-xl"></div>
      </div>
    </div>
  )
}
