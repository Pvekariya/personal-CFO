import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import OpenAI from "openai"
import { PDFParse } from "pdf-parse"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from PDF using pdf-parse v2
    const parser = new PDFParse({ data: buffer })
    const data = await parser.getText()
    await parser.destroy()
    
    const text = data.text
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Could not extract text from PDF." }, { status: 400 })
    }

    // Use OpenAI to intelligently extract transactions
    const prompt = `You are an expert financial parsing assistant. Extract all financial transactions from the following raw bank statement text.
Return ONLY a valid JSON object with a single key "transactions" which contains an array of objects.
NO markdown formatting or code blocks.
Each transaction object MUST have:
- date: "YYYY-MM-DD"
- description: string (clean merchant or transaction details, remove gibberish)
- amount: number (absolute positive value, no commas or currency symbols)
- type: "INCOME" or "EXPENSE"

Raw Bank Statement Text:
${text.substring(0, 20000)}`

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini", // fast and capable
      response_format: { type: "json_object" }
    })

    const responseContent = completion.choices[0].message.content
    if (!responseContent) {
      throw new Error("No response from AI")
    }

    const parsedData = JSON.parse(responseContent)
    
    if (!parsedData.transactions || !Array.isArray(parsedData.transactions)) {
      return NextResponse.json({ error: "Invalid format returned from AI" }, { status: 500 })
    }

    return NextResponse.json({ data: parsedData.transactions })

  } catch (error: any) {
    console.error("PDF parse error:", error)
    return NextResponse.json({ error: error.message || "Failed to parse PDF statement" }, { status: 500 })
  }
}
