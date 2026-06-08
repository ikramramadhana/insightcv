import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 60

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
})

const SYSTEM_PROMPT = `You are an expert HR consultant and career coach with 15+ years of experience reviewing resumes for top tech companies. 
Analyze the provided CV/resume and return a JSON object with EXACTLY this structure (no markdown, no extra text, pure JSON only):

{
  "name": "candidate full name or 'Unknown'",
  "title": "current/target job title from CV",
  "ats_score": <integer 0-100>,
  "ats_breakdown": {
    "formatting": <integer 0-100>,
    "keywords": <integer 0-100>,
    "completeness": <integer 0-100>,
    "readability": <integer 0-100>
  },
  "overall_verdict": "one sentence overall assessment",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "skill_gap": {
    "technical_missing": ["skill 1", "skill 2", "skill 3"],
    "soft_skills_missing": ["skill 1", "skill 2"],
    "certifications_recommended": ["cert 1", "cert 2"]
  },
  "suitable_positions": [
    { "title": "Job Title 1", "match_percent": <integer>, "reason": "short reason" },
    { "title": "Job Title 2", "match_percent": <integer>, "reason": "short reason" },
    { "title": "Job Title 3", "match_percent": <integer>, "reason": "short reason" }
  ],
  "improvements": [
    { "section": "section name", "priority": "high|medium|low", "suggestion": "specific actionable suggestion" },
    { "section": "section name", "priority": "high|medium|low", "suggestion": "specific actionable suggestion" },
    { "section": "section name", "priority": "high|medium|low", "suggestion": "specific actionable suggestion" },
    { "section": "section name", "priority": "medium|low", "suggestion": "specific actionable suggestion" }
  ],
  "keywords_found": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "keywords_missing": ["keyword1", "keyword2", "keyword3"],
  "experience_level": "fresher|junior|mid|senior",
  "summary_for_recruiter": "2-3 sentence recruiter-friendly summary of this candidate"
}`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    let cvText = ''

    if (file.name.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(buffer)
      cvText = data.text
    } else {
      cvText = buffer.toString('utf-8')
    }

    if (!cvText.trim()) {
      return NextResponse.json({ error: 'Tidak bisa membaca teks dari file. Pastikan PDF bukan hasil scan.' }, { status: 400 })
    }

    // Trim to avoid token limit
    const trimmedCV = cvText.slice(0, 6000)

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyze this CV/Resume:\n\n${trimmedCV}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const raw = completion.choices[0].message.content || ''

    // Extract JSON safely
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Model did not return valid JSON')

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json({ ok: true, result, filename: file.name })

  } catch (err: unknown) {
    console.error(err)
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('401') || msg.includes('API key')) {
      return NextResponse.json({ error: 'GROQ_API_KEY tidak valid.' }, { status: 401 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
