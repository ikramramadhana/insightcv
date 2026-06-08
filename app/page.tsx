'use client'

import { useState, useRef } from 'react'

interface ATSBreakdown { formatting: number; keywords: number; completeness: number; readability: number }
interface SkillGap { technical_missing: string[]; soft_skills_missing: string[]; certifications_recommended: string[] }
interface Position { title: string; match_percent: number; reason: string }
interface Improvement { section: string; priority: 'high' | 'medium' | 'low'; suggestion: string }

interface CVResult {
  name: string
  title: string
  ats_score: number
  ats_breakdown: ATSBreakdown
  overall_verdict: string
  strengths: string[]
  weaknesses: string[]
  skill_gap: SkillGap
  suitable_positions: Position[]
  improvements: Improvement[]
  keywords_found: string[]
  keywords_missing: string[]
  experience_level: string
  summary_for_recruiter: string
}

const priorityColor = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }
const priorityBg = { high: 'rgba(239,68,68,0.08)', medium: 'rgba(245,158,11,0.08)', low: 'rgba(34,197,94,0.08)' }
const priorityBorder = { high: 'rgba(239,68,68,0.2)', medium: 'rgba(245,158,11,0.2)', low: 'rgba(34,197,94,0.2)' }

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size*0.08} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.08}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x={size/2} y={size/2 - 4} textAnchor="middle" fill="white" fontSize={size*0.22} fontWeight="700">{score}</text>
      <text x={size/2} y={size/2 + size*0.14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={size*0.1}>/ 100</text>
    </svg>
  )
}

function MiniBar({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
        <span>{label}</span><span style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CVResult | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'positions' | 'improvements'>('overview')
  const fileRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  function handleFile(f: File) {
    if (!f.name.match(/\.(pdf|txt|md)$/i)) { setError('Hanya file PDF, TXT, atau MD yang didukung.'); return }
    setFile(f); setError(''); setResult(null)
  }

  async function analyze() {
    if (!file) return
    setLoading(true); setError(''); setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const r = await fetch('/api/analyze', { method: 'POST', body: fd })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Terjadi error')
      setResult(data.result)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi error')
    }
    setLoading(false)
  }

  async function downloadPDF() {
    if (!result) return
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const margin = 20
    let y = 20

    const addLine = (text: string, size = 11, bold = false, color: [number,number,number] = [220,220,220]) => {
      doc.setFontSize(size)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setTextColor(...color)
      const lines = doc.splitTextToSize(text, 170)
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.text(line, margin, y); y += size * 0.5 + 2
      })
      y += 2
    }

    const addSection = (title: string) => {
      y += 4
      doc.setFillColor(40, 20, 80)
      doc.roundedRect(margin - 4, y - 6, 178, 10, 2, 2, 'F')
      addLine(title, 12, true, [180, 130, 255])
    }

    // Header
    doc.setFillColor(15, 10, 30)
    doc.rect(0, 0, 210, 297, 'F')
    addLine('InsightCV — AI Resume Analysis Report', 18, true, [180, 130, 255])
    addLine(`${result.name} · ${result.title}`, 13, false, [200, 200, 200])
    addLine(`ATS Score: ${result.ats_score}/100  |  Level: ${result.experience_level}`, 11, false, [150, 150, 150])
    y += 4

    addSection('OVERALL VERDICT')
    addLine(result.overall_verdict)

    addSection('ATS SCORE BREAKDOWN')
    Object.entries(result.ats_breakdown).forEach(([k, v]) => addLine(`${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}/100`))

    addSection('STRENGTHS')
    result.strengths.forEach(s => addLine(`✓ ${s}`))

    addSection('WEAKNESSES')
    result.weaknesses.forEach(w => addLine(`✗ ${w}`))

    addSection('SKILL GAP — Technical')
    result.skill_gap.technical_missing.forEach(s => addLine(`• ${s}`))
    addSection('SKILL GAP — Soft Skills')
    result.skill_gap.soft_skills_missing.forEach(s => addLine(`• ${s}`))

    addSection('SUITABLE POSITIONS')
    result.suitable_positions.forEach(p => addLine(`${p.match_percent}% match — ${p.title}: ${p.reason}`))

    addSection('IMPROVEMENT SUGGESTIONS')
    result.improvements.forEach(i => addLine(`[${i.priority.toUpperCase()}] ${i.section}: ${i.suggestion}`))

    addSection('RECRUITER SUMMARY')
    addLine(result.summary_for_recruiter)

    doc.save(`InsightCV_${result.name.replace(/\s/g,'_')}.pdf`)
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'skills', label: 'Skill Gap' },
    { id: 'positions', label: 'Posisi Cocok' },
    { id: 'improvements', label: 'Saran' },
  ] as const

  return (
    <div className="min-h-screen" style={{ background: '#080612', fontFamily: "'Inter', sans-serif", color: 'white' }}>

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12), transparent 65%)' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent 65%)' }} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(8,6,18,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #059669)' }}>
            <svg width="15" height="15" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <span className="font-bold text-sm tracking-tight">InsightCV</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '0.5px solid rgba(124,58,237,0.3)' }}>AI Powered</span>
        </div>
        <a href="https://github.com/ikramramadhana" target="_blank" className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          @ikramramadhana
        </a>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">

        {/* Hero */}
        {!result && (
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(124,58,237,0.1)', border: '0.5px solid rgba(124,58,237,0.25)', color: '#c4b5fd' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Powered by LLaMA 3.3 70B via Groq
            </div>
            <h1 className="text-4xl font-bold mb-4 leading-tight">
              Analisis CV kamu dengan
              <span className="block" style={{ background: 'linear-gradient(135deg, #7c3aed, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Kecerdasan Buatan
              </span>
            </h1>
            <p className="text-base max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Dapatkan ATS Score, skill gap analysis, posisi yang cocok, dan saran perbaikan spesifik dalam hitungan detik.
            </p>
          </div>
        )}

        {/* Upload zone */}
        {!result && (
          <div className="mb-6">
            <div
              className="rounded-3xl p-10 text-center cursor-pointer transition-all duration-300"
              style={{
                border: `2px dashed ${dragOver ? 'rgba(124,58,237,0.8)' : file ? 'rgba(5,150,105,0.6)' : 'rgba(255,255,255,0.1)'}`,
                background: dragOver ? 'rgba(124,58,237,0.05)' : file ? 'rgba(5,150,105,0.04)' : 'rgba(255,255,255,0.02)',
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
            >
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.3)' }}>
                    <svg width="24" height="24" fill="none" stroke="#34d399" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: '#34d399' }}>{file.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{(file.size / 1024).toFixed(1)} KB · Klik untuk ganti</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                    <svg width="24" height="24" fill="none" stroke="#a78bfa" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1">Drop CV kamu di sini</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>atau klik untuk memilih file · PDF, TXT, MD</p>
                  </div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 rounded-2xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
            ❌ {error}
          </div>
        )}

        {/* Analyze button */}
        {!result && (
          <button onClick={analyze} disabled={!file || loading}
            className="w-full py-4 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
            style={{ background: file ? 'linear-gradient(135deg, #7c3aed, #059669)' : 'rgba(255,255,255,0.05)', boxShadow: file ? '0 0 30px rgba(124,58,237,0.3)' : 'none' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Menganalisis CV kamu...
              </span>
            ) : '✨ Analisis Sekarang'}
          </button>
        )}

        {/* ══ RESULT ══ */}
        {result && (
          <div ref={resultRef} className="space-y-6">

            {/* Header card */}
            <div className="rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(5,150,105,0.1))', border: '0.5px solid rgba(124,58,237,0.25)' }}>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <ScoreRing score={result.ats_score} size={110} />
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start mb-1">
                    <h2 className="text-xl font-bold">{result.name}</h2>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', border: '0.5px solid rgba(124,58,237,0.3)' }}>
                      {result.experience_level}
                    </span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{result.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{result.overall_verdict}</p>
                  <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
                    <button onClick={() => { setResult(null); setFile(null) }}
                      className="text-xs px-4 py-2 rounded-xl transition-colors"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                      ← Analisis Baru
                    </button>
                    <button onClick={downloadPDF}
                      className="text-xs px-4 py-2 rounded-xl font-medium transition-all hover:scale-105"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #059669)', color: 'white' }}>
                      ↓ Download PDF Report
                    </button>
                  </div>
                </div>
              </div>

              {/* ATS breakdown mini bars */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-5" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
                {Object.entries(result.ats_breakdown).map(([k, v]) => (
                  <MiniBar key={k} value={v} label={k.charAt(0).toUpperCase() + k.slice(1)} />
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={activeTab === t.id
                    ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.6), rgba(5,150,105,0.4))', color: 'white' }
                    : { color: 'rgba(255,255,255,0.4)' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Overview tab ── */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="rounded-2xl p-5" style={{ background: 'rgba(34,197,94,0.06)', border: '0.5px solid rgba(34,197,94,0.18)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#4ade80' }}>Kelebihan</p>
                  <div className="space-y-2.5">
                    {result.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-lg shrink-0 flex items-center justify-center mt-0.5" style={{ background: 'rgba(34,197,94,0.15)' }}>
                          <svg width="10" height="10" fill="none" stroke="#4ade80" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{s}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="rounded-2xl p-5" style={{ background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.18)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#f87171' }}>Kekurangan</p>
                  <div className="space-y-2.5">
                    {result.weaknesses.map((w, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-lg shrink-0 flex items-center justify-center mt-0.5" style={{ background: 'rgba(239,68,68,0.15)' }}>
                          <svg width="10" height="10" fill="none" stroke="#f87171" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </div>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{w}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keywords found */}
                <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Keywords Ditemukan ✓</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keywords_found.map((k, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '0.5px solid rgba(34,197,94,0.2)' }}>{k}</span>
                    ))}
                  </div>
                </div>

                {/* Keywords missing */}
                <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Keywords Kurang ✗</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keywords_missing.map((k, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '0.5px solid rgba(239,68,68,0.2)' }}>{k}</span>
                    ))}
                  </div>
                </div>

                {/* Recruiter summary */}
                <div className="sm:col-span-2 rounded-2xl p-5" style={{ background: 'rgba(124,58,237,0.06)', border: '0.5px solid rgba(124,58,237,0.18)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#a78bfa' }}>Ringkasan untuk Rekruiter</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{result.summary_for_recruiter}</p>
                </div>
              </div>
            )}

            {/* ── Skill Gap tab ── */}
            {activeTab === 'skills' && (
              <div className="space-y-4">
                <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#f87171' }}>Technical Skills yang Kurang</p>
                  <div className="flex flex-wrap gap-2">
                    {result.skill_gap.technical_missing.map((s, i) => (
                      <span key={i} className="text-xs px-3 py-1.5 rounded-xl font-medium" style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '0.5px solid rgba(239,68,68,0.2)' }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#fbbf24' }}>Soft Skills yang Kurang</p>
                  <div className="flex flex-wrap gap-2">
                    {result.skill_gap.soft_skills_missing.map((s, i) => (
                      <span key={i} className="text-xs px-3 py-1.5 rounded-xl font-medium" style={{ background: 'rgba(245,158,11,0.08)', color: '#fde68a', border: '0.5px solid rgba(245,158,11,0.2)' }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#a78bfa' }}>Sertifikasi yang Direkomendasikan</p>
                  <div className="space-y-2">
                    {result.skill_gap.certifications_recommended.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(124,58,237,0.08)', border: '0.5px solid rgba(124,58,237,0.18)' }}>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.2)' }}>
                          <svg width="11" height="11" fill="none" stroke="#a78bfa" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
                        </div>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{c}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Positions tab ── */}
            {activeTab === 'positions' && (
              <div className="space-y-3">
                {result.suitable_positions.map((p, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <div className="w-14 h-14 rounded-2xl shrink-0 flex flex-col items-center justify-center" style={{ background: p.match_percent >= 80 ? 'rgba(34,197,94,0.12)' : p.match_percent >= 60 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.1)', border: `0.5px solid ${p.match_percent >= 80 ? 'rgba(34,197,94,0.25)' : p.match_percent >= 60 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.2)'}` }}>
                      <span className="text-base font-bold" style={{ color: p.match_percent >= 80 ? '#4ade80' : p.match_percent >= 60 ? '#fbbf24' : '#f87171' }}>{p.match_percent}%</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-1">{p.title}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{p.reason}</p>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>#{i + 1}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Improvements tab ── */}
            {activeTab === 'improvements' && (
              <div className="space-y-3">
                {result.improvements.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])).map((imp, i) => (
                  <div key={i} className="p-4 rounded-2xl" style={{ background: priorityBg[imp.priority], border: `0.5px solid ${priorityBorder[imp.priority]}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: `${priorityColor[imp.priority]}20`, color: priorityColor[imp.priority], border: `0.5px solid ${priorityColor[imp.priority]}40` }}>{imp.priority}</span>
                      <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>{imp.section}</span>
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{imp.suggestion}</p>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs mt-12" style={{ color: 'rgba(255,255,255,0.15)' }}>
          InsightCV · built by <a href="https://github.com/ikramramadhana" target="_blank" className="hover:text-violet-400 transition-colors">@ikramramadhana</a>
        </p>
      </main>
    </div>
  )
}
