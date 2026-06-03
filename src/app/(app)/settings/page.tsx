"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    isdCode: "+91",
    phoneNumber: "",
    age: "",
    city: "",
    state: "",
    retirementAge: "",
    riskProfile: "",
    monthlyIncome: "",
    annualCTC: "",
    employmentType: "",
    dependents: "",
    maritalStatus: "",
    financialFreedomTarget: "",
    financialFreedomYear: "",
    inflationAssumption: "",
    currency: "INR",
    twoFactorEnabled: false,
    biometricEnabled: false,
    avatarUrl: "",
  })

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/v1/profile")
        const json = await res.json()
        if (json.data) {
          const user = json.data
          const profile = user.profile || {}
          let isd = "+91"
          let num = user.phone || ""
          
          const popularCodes = ["+1", "+44", "+61", "+91", "+971", "+65", "+81"]
          if (user.phone) {
            for (const code of popularCodes) {
              if (user.phone.startsWith(code)) {
                isd = code
                num = user.phone.slice(code.length)
                break
              }
            }
          }

          setFormData({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            isdCode: isd,
            phoneNumber: num,
            age: profile.age?.toString() || "",
            city: profile.city || "",
            state: profile.state || "",
            retirementAge: profile.retirementAge?.toString() || "",
            riskProfile: profile.riskProfile || "",
            monthlyIncome: profile.monthlyIncome?.toString() || "",
            annualCTC: profile.annualCTC?.toString() || "",
            employmentType: profile.employmentType || "",
            dependents: profile.dependents?.toString() || "0",
            maritalStatus: profile.maritalStatus || "",
            financialFreedomTarget: profile.financialFreedomTarget?.toString() || "",
            financialFreedomYear: profile.financialFreedomYear?.toString() || "",
            inflationAssumption: profile.inflationAssumption?.toString() || "7",
            currency: user.currency || "INR",
            twoFactorEnabled: user.twoFactorEnabled || false,
            biometricEnabled: user.profile?.metadata ? (user.profile.metadata as any).biometricEnabled : false,
            avatarUrl: user.avatarUrl || "",
          })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage({ text: "", type: "" })

    try {
      const payload = {
        ...formData,
        phone: formData.phoneNumber ? `${formData.isdCode}${formData.phoneNumber}` : "",
      }

      const res = await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        setMessage({ text: json.error || "Failed to update profile", type: "error" })
      } else {
        setMessage({ text: "Profile updated successfully!", type: "success" })
      }
    } catch (e) {
      setMessage({ text: "Something went wrong", type: "error" })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage({ text: "", type: "" }), 5000)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading profile...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings & Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your personal information and financial parameters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {message.text && (
          <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>
            {message.text}
          </div>
        )}

        {/* Personal Details */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-lg">Personal Details</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Profile Photo</label>
              <div className="flex gap-4 items-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border">
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl">👤</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      
                      const data = new FormData()
                      data.append("file", file)
                      
                      try {
                        const res = await fetch("/api/v1/profile/avatar", {
                          method: "POST",
                          body: data
                        })
                        const json = await res.json()
                        if (json.url) {
                          setFormData({ ...formData, avatarUrl: json.url })
                        }
                      } catch (err) {
                        console.error("Upload failed", err)
                        setMessage({ text: "Failed to upload photo", type: "error" })
                      }
                    }}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary/10 file:text-primary
                      hover:file:bg-primary/20 cursor-pointer"
                  />
                  <p className="text-[10px] text-muted-foreground ml-1">JPG, PNG, GIF up to 5MB.</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <div className="flex gap-2">
                <select
                  value={formData.isdCode}
                  onChange={(e) => setFormData({ ...formData, isdCode: e.target.value })}
                  className="flex h-9 w-28 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸/🇨🇦 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+65">🇸🇬 +65</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="flex h-9 flex-1 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Financial Profile */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h2 className="font-semibold text-lg">Financial Profile</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Monthly Income</label>
              <input
                type="number"
                value={formData.monthlyIncome}
                onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Annual CTC</label>
              <input
                type="number"
                value={formData.annualCTC}
                onChange={(e) => setFormData({ ...formData, annualCTC: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Risk Profile</label>
              <select
                value={formData.riskProfile}
                onChange={(e) => setFormData({ ...formData, riskProfile: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Select risk profile</option>
                <option value="Conservative">Conservative</option>
                <option value="Moderate">Moderate</option>
                <option value="Aggressive">Aggressive</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Retirement Age</label>
              <input
                type="number"
                value={formData.retirementAge}
                onChange={(e) => setFormData({ ...formData, retirementAge: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Global Assumptions */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h2 className="font-semibold text-lg">Global Assumptions</h2>
            <p className="text-xs text-muted-foreground mt-1">These values are used as defaults for your financial calculators.</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Inflation Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.inflationAssumption}
                onChange={(e) => setFormData({ ...formData, inflationAssumption: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (د.إ)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security & Authentication */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h2 className="font-semibold text-lg">Security & Authentication</h2>
            <p className="text-xs text-muted-foreground mt-1">Manage your login preferences and account security.</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h4 className="text-sm font-medium">Two-Factor Authentication (OTP)</h4>
                <p className="text-xs text-muted-foreground">Receive a one-time passcode on your phone/email when signing in.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={formData.twoFactorEnabled}
                  onChange={(e) => setFormData({ ...formData, twoFactorEnabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2">Biometric Login <span>(Fingerprint/FaceID)</span></h4>
                <p className="text-xs text-muted-foreground">Enable hardware biometrics for faster access to the web/mobile app.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={formData.biometricEnabled}
                  onChange={async (e) => {
                    const checked = e.target.checked
                    if (checked) {
                      // Attempt WebAuthn Registration
                      try {
                        const { startRegistration } = await import('@simplewebauthn/browser')
                        
                        const optsRes = await fetch('/api/auth/webauthn/register-options')
                        const options = await optsRes.json()
                        
                        if (options.error) throw new Error(options.error)
                        
                        const attResp = await startRegistration(options)
                        
                        const verifyRes = await fetch('/api/auth/webauthn/register-verify', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(attResp)
                        })
                        
                        const verifyJson = await verifyRes.json()
                        if (verifyJson.verified) {
                          setFormData({ ...formData, biometricEnabled: true })
                          setMessage({ text: "Biometric setup successfully!", type: "success" })
                        } else {
                          throw new Error("Verification failed")
                        }
                      } catch (err: any) {
                        console.error(err)
                        if (err.name === 'ConstraintError') {
                          // Already registered on this device! Just enable it.
                          await fetch('/api/v1/profile', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ biometricEnabled: true })
                          })
                          setFormData({ ...formData, biometricEnabled: true })
                          setMessage({ text: "Biometric already registered and enabled!", type: "success" })
                        } else {
                          setFormData({ ...formData, biometricEnabled: false })
                          setMessage({ text: err.message || "Failed to setup biometrics", type: "error" })
                        }
                      }
                    } else {
                      // Turning it off - update DB
                      await fetch('/api/v1/profile', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ biometricEnabled: false })
                      })
                      setFormData({ ...formData, biometricEnabled: false })
                      setMessage({ text: "Biometric login disabled.", type: "success" })
                    }
                  }}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={saving} size="lg">
            {saving ? "Saving Changes..." : "Save Profile Settings"}
          </Button>
        </div>
      </form>
    </div>
  )
}
