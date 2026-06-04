"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"

export default function SettingsPage() {
  const { update } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" })
  const [savingPassword, setSavingPassword] = useState(false)
  
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

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMessage({ text: "", type: "" })

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ text: "New passwords do not match", type: "error" })
      return
    }

    setSavingPassword(true)
    try {
      const res = await fetch("/api/v1/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })

      const data = await res.json()
      if (res.ok) {
        setPasswordMessage({ text: "Password changed successfully!", type: "success" })
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      } else {
        setPasswordMessage({ text: data.error || "Failed to change password", type: "error" })
      }
    } catch (err) {
      setPasswordMessage({ text: "An error occurred", type: "error" })
    } finally {
      setSavingPassword(false)
      setTimeout(() => setPasswordMessage({ text: "", type: "" }), 5000)
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
                      
                      try {
                        // Compress image on client side to avoid Vercel limits
                        const reader = new FileReader()
                        reader.readAsDataURL(file)
                        reader.onload = (e) => {
                          const img = new Image()
                          img.src = e.target?.result as string
                          img.onload = async () => {
                            const canvas = document.createElement("canvas")
                            const maxWidth = 256
                            const ratio = maxWidth / img.width
                            canvas.width = maxWidth
                            canvas.height = img.height * ratio
                            const ctx = canvas.getContext("2d")
                            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
                            const base64 = canvas.toDataURL("image/jpeg", 0.8)
                            
                            // Send base64 to standard profile patch endpoint
                            const res = await fetch("/api/v1/profile", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ avatarUrl: base64 })
                            })
                            if (res.ok) {
                              setFormData({ ...formData, avatarUrl: base64 })
                              await update({ image: base64 })
                            } else {
                              throw new Error("Failed to save")
                            }
                          }
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

        {/* Security Note */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h2 className="font-semibold text-lg">Security</h2>
            <p className="text-xs text-muted-foreground mt-1">Your account is secured with password-based authentication.</p>
          </div>
          <div className="p-6">
            <p className="text-sm text-muted-foreground">
              To change your password, use the Change Password section below.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={saving} size="lg">
            {saving ? "Saving Changes..." : "Save Profile Settings"}
          </Button>
        </div>
      </form>

      {/* Change Password Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mt-8">
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <h2 className="font-semibold text-lg">Change Password</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Update your password or replace your temporary password.
          </p>
        </div>
        <form onSubmit={handlePasswordChange} className="p-6 space-y-6">
          {passwordMessage.text && (
            <div className={`p-4 rounded-lg text-sm font-medium ${passwordMessage.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>
              {passwordMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Current Password (or Temporary Password)</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="default" disabled={savingPassword}>
              {savingPassword ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
