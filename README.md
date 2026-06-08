# InsightCV 🧠

**AI-powered Resume Analyzer** — Upload CV kamu dan dapatkan analisis mendalam dalam hitungan detik.

## Fitur

- 📊 **ATS Score** — skor 0-100 dengan breakdown per kategori (formatting, keywords, completeness, readability)
- 🎯 **Skill Gap Analysis** — technical skills, soft skills, dan sertifikasi yang direkomendasikan
- 💼 **Posisi yang Cocok** — top 3 posisi berdasarkan isi CV + persentase match
- 💡 **Saran Improvement** — actionable suggestions berdasarkan prioritas (high/medium/low)
- 📄 **Download PDF Report** — hasil analisis bisa didownload sebagai PDF
- ⚡ **Super cepat** — powered by LLaMA 3.3 70B via Groq

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Next.js API Routes |
| LLM | Groq API — llama-3.3-70b-versatile |
| PDF Parsing | pdf-parse v1.1.1 |
| PDF Export | jsPDF |
| Deployment | Vercel |

## Setup

```bash
# 1. Install
npm install

# 2. Buat .env.local
GROQ_API_KEY=gsk_xxxxxx   # dari console.groq.com (gratis)

# 3. Jalankan
npm run dev
```

Buka http://localhost:3000

## Deploy ke Vercel

```bash
git init && git add . && git commit -m "init: InsightCV"
git remote add origin https://github.com/ikramramadhana/insightcv.git
git push -u origin main
```

Import di vercel.com → tambah `GROQ_API_KEY` di Environment Variables → Deploy.

---

Built with ♥ by [@ikramramadhana](https://github.com/ikramramadhana)
