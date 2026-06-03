"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"

type Document = {
  id: string
  name: string
  type: string
  description: string | null
  fileUrl: string
  expiryDate: string | null
  isConfidential: boolean
  createdAt: string
}

const DOCUMENT_TYPES = [
  "PAN_CARD", "AADHAAR", "PASSPORT", "DRIVING_LICENSE", "ITR", "FORM_16", 
  "GST_CERTIFICATE", "PROPERTY_DOCUMENT", "LOAN_DOCUMENT", "INSURANCE_POLICY", 
  "INVESTMENT_STATEMENT", "BANK_STATEMENT", "SALARY_SLIP", "OFFER_LETTER", 
  "MEDICAL_RECORD", "LEGAL_DOCUMENT", "COMPANY_DOCUMENT", "CONTRACT", 
  "WARRANTY", "TAX_NOTICE", "OTHER"
]

export default function DocumentVaultPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    type: "OTHER",
    description: "",
    fileUrl: "",
    expiryDate: "",
    isConfidential: false,
    file: null as File | null,
  })
  const [uploadMode, setUploadMode] = useState<"upload" | "link">("upload")

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/vault")
      const json = await res.json()
      if (json.data) setDocuments(json.data)
    } catch (e) {
      console.error("Failed to fetch documents", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  function resetForm() {
    setFormData({
      name: "",
      type: "OTHER",
      description: "",
      fileUrl: "",
      expiryDate: "",
      isConfidential: false,
      file: null,
    })
    setFormError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError("")

    try {
      if (uploadMode === "upload" && !formData.file) {
        setFormError("Please select a file to upload")
        setSaving(false)
        return
      }

      const payload = new FormData()
      payload.append("name", formData.name)
      payload.append("type", formData.type)
      payload.append("description", formData.description)
      payload.append("expiryDate", formData.expiryDate)
      payload.append("isConfidential", formData.isConfidential ? "true" : "false")

      if (uploadMode === "upload" && formData.file) {
        payload.append("file", formData.file)
      } else {
        payload.append("fileUrl", formData.fileUrl || "https://dummy-vault-url.com/document.pdf")
      }

      const res = await fetch("/api/v1/vault", {
        method: "POST",
        body: payload,
      })
      const json = await res.json()

      if (!res.ok) {
        setFormError(json.error || "Failed to save document")
        return
      }

      setShowForm(false)
      resetForm()
      fetchDocuments()
    } catch (e) {
      setFormError("Something went wrong.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this document?")) return
    try {
      await fetch(`/api/v1/vault/${id}`, { method: "DELETE" })
      fetchDocuments()
    } catch (e) {
      console.error("Failed to delete", e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Vault</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Securely store your PAN, Aadhaar, Insurance, and Tax documents.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
          {showForm ? "Cancel" : "+ Add Document"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">New Document</h3>

          {formError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. FY23 ITR Acknowledgment"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2 border rounded-lg p-4 bg-muted/30">
              <div className="flex gap-4 mb-4 border-b pb-2">
                <button 
                  type="button" 
                  onClick={() => setUploadMode("upload")}
                  className={`text-sm font-medium pb-1 ${uploadMode === "upload" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                >
                  Upload File
                </button>
                <button 
                  type="button"
                  onClick={() => setUploadMode("link")}
                  className={`text-sm font-medium pb-1 ${uploadMode === "link" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                >
                  Link URL
                </button>
              </div>

              {uploadMode === "upload" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select File from Device</label>
                  <input
                    type="file"
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">PDF, JPEG, or PNG up to 4MB.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Document Link (e.g. GDrive URL)</label>
                  <input
                    type="url"
                    value={formData.fileUrl}
                    onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Expiry Date (Optional)</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isConfidential"
              checked={formData.isConfidential}
              onChange={(e) => setFormData({ ...formData, isConfidential: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="isConfidential" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Mark as Confidential (Requires re-authentication to view)
            </label>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" disabled={saving}>
              {saving ? "Uploading..." : "Save Document"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading vault...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card border-dashed">
          <p className="text-lg">Your vault is empty</p>
          <p className="text-sm mt-1">Store your important financial and tax documents here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date()
            
            return (
              <div key={doc.id} className="rounded-xl border border-border bg-card p-5 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                {doc.isConfidential && (
                  <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                    CONFIDENTIAL
                  </div>
                )}
                
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-xl">
                      {doc.type.includes("POLICY") ? "🛡️" : 
                       doc.type.includes("TAX") || doc.type.includes("ITR") ? "🧾" : 
                       doc.type.includes("CARD") || doc.type.includes("LICENSE") ? "🪪" : "📄"}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm line-clamp-1">{doc.name}</h4>
                      <p className="text-xs text-muted-foreground">{doc.type.replace(/_/g, " ")}</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground mt-4">
                    <p>Added: {formatDate(doc.createdAt)}</p>
                    {doc.expiryDate && (
                      <p className={isExpired ? "text-rose-500 font-medium" : ""}>
                        Expires: {formatDate(doc.expiryDate)} {isExpired ? "(EXPIRED)" : ""}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <a 
                    href={doc.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-primary text-primary-foreground text-xs font-medium py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    View File
                  </a>
                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="px-3 bg-muted text-muted-foreground text-xs font-medium py-2 rounded-lg hover:bg-destructive hover:text-white transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
