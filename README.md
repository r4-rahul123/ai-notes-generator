# 🚀 AI Notes & Quiz Generator (Premium SaaS Architecture)

An advanced, full-stack Next.js application that leverages AI to generate comprehensive study notes, flashcards, interactive MCQs, and vector-embedded RAG chats from simple topics or complex PDF uploads. 

Built with enterprise-grade architecture featuring BullMQ + Redis background processing, MongoDB vector search, and a stunning Glassmorphism UI.

---

## ✨ Features

1. **🧠 Multi-Model AI Engine (Gemini 1.5 Flash & Pro)**:
   - Dynamic prompt generation for structured study materials.
   - Intelligent PDF extraction (Fast client-side parsing + server fallback).
   - Robust 5-tier fail-safe JSON parser (`jsonrepair` + regex recovery).

2. **⚙️ Enterprise Background Processing (BullMQ + Redis)**:
   - Asynchronous queue processing via a dedicated background worker (\`npm run worker\`).
   - Bypasses strict Vercel 60s timeout limits on heavy AI PDF parsing tasks.
   - Built-in Redis Rate-Limiting (Max 3 notes/minute) to prevent API abuse.
   - Real-time client polling for interactive generation progress bars.

3. **✨ Premium Glassmorphism UI (Tailwind v4)**:
   - High-end Midnight Black & Indigo Aurora glowing background in Dark Mode.
   - Translucent frosted-glass (backdrop-blur) UI cards with hover-bounce physics and glowing borders.
   - Custom sleek scrollbars and refined typography gradients.

4. **📊 Interactive Dashboard & Student Study Analytics**:
   - Real-time statistics: Total Notes Created, Quiz Average Accuracy %, Tests Taken, and Visual Flowcharts Mastered.
   - Live search by title, topic, or keyword.
   - Category / Class level filter chips (`All`, `School`, `College`, `Competitive Exams`).
   - Dynamic sorting: *Newest First*, *Oldest First*, *Highest Quiz Score*, and *Title (A-Z)*.

5. **🔗 1-Click Shareable Public Study Links & WhatsApp**:
   - Public view route (`/share/[id]`) allows anyone to study, practice MCQs, and download PDFs without logging in.
   - Compact share modal with 1-click URL copy and pre-formatted WhatsApp chat message.

6. **❓ Important Exam Questions & Live AI Answers**:
   - Generates high-yield exam questions with model answers.
   - On-demand AI answer generator for custom questions.

7. **✅ Interactive MCQ Practice & Quiz History**:
   - 5-6 questions per test with instant feedback and score cards.
   - Quiz history tracking with score progression.
   - AI dynamic test regenerator for fresh questions.

8. **💬 Grounded RAG Vector Note Chat**:
   - Chat directly with your study notes using cosine similarity search on stored Pinecone/MongoDB embeddings.

9. **📄 Premium Server-Side PDF Exporter**:
   - Clean high-contrast #000 text design tailored specifically for PDF exporting.
   - Wraps code blocks, grids, and Mermaid diagrams perfectly over page breaks.

---

## 📂 File Structure & System Architecture

```text
ai_notes_generator/
├── src/
│   ├── app/                               # Next.js App Router
│   │   ├── api/                           # Backend API Endpoints
│   │   │   ├── generate/                  # Push jobs to BullMQ & Rate Limiting
│   │   │   ├── jobs/[id]/                 # Job status polling endpoint
│   │   │   ├── answer-question/           # On-demand AI question answers
│   │   │   ├── chat/                      # Grounded RAG vector note chat
│   │   │   ├── notes/[id]/mcq/new/        # Fresh MCQ test regenerator
│   │   │   ├── notes/[id]/pdf/            # Server-side PDF export engine
│   │   │   ├── razorpay/                  # Payment gateway integration
│   │   ├── dashboard/                     # Authenticated student dashboard
│   │   ├── generate/                      # Note generation studio with queue polling
│   │   ├── notes/[id]/                    # Full study note view & workspace
│   │   ├── pricing/                       # Credit store & plans
│   │   ├── share/[id]/                    # Public shared study page (No login needed)
│   │   ├── sign-in/                       # Clerk Authentication sign-in
│   │   ├── sign-up/                       # Clerk Authentication sign-up
│   │   ├── globals.css                    # Tailwind CSS & Premium Print/Scrollbar rules
│   │   ├── layout.tsx                     # Root layout with Aurora Glowing Background
│   │   ├── page.tsx                       # Redesigned interactive landing page
│   │
│   ├── components/                        # Modular React Components
│   │   ├── ui/                            # Base UI / Tailwind primitives
│   │   ├── CodeBlock.tsx                  # Syntax highlighted code box with copy button
│   │   ├── DashboardClient.tsx            # Glassmorphism dashboard, analytics & filters
│   │   ├── ImportantQuestionsSection.tsx  # Exam questions with expandable answers
│   │   ├── MCQSection.tsx                 # Practice MCQ quiz with score tracking
│   │   ├── MermaidRenderer.tsx            # SVG flowchart & concept map renderer
│   │   ├── Navbar.tsx                     # Top navigation with frosted-glass effect
│   │   ├── NoteChat.tsx                   # Grounded RAG chat sidebar
│   │
│   ├── lib/                               # Core Libraries & Utilities
│   │   ├── models/                        # MongoDB Mongoose Schemas
│   │   ├── gemini.ts                      # Gemini 1.5 API fallback client
│   │   ├── mongoose.ts                    # MongoDB connection caching
│   │   ├── queue.ts                       # BullMQ queue configuration
│   │   ├── redis.ts                       # ioredis connection pool
│   │   ├── rag/                           # Document chunking & vector search algorithms
│   │
│   ├── worker.ts                          # Standalone background queue processor (BullMQ)
│   ├── middleware.ts                      # Clerk authentication route matcher
│
├── .env.local                             # Environment variables configuration
├── package.json                           # Project dependencies & scripts
├── tsconfig.json                          # TypeScript configuration
└── README.md                              # Project documentation
```

---

## 🔑 Environment Variables (`.env.local`)

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ai_notes_generator

# Google Gemini API
GEMINI_API_KEY=AIzaSy...

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Redis (For Background Jobs & Rate Limiting)
REDIS_URL=redis://127.0.0.1:6380
```

---

## 💻 Running Locally

This project uses an asynchronous background worker for heavy AI generation.

```bash
# 1. Install dependencies
npm install

# 2. Start your Redis server (via Docker)
# Note: Using port 6380 to avoid conflicts with native Windows Redis services
docker run -d --name redis-stack -p 6380:6379 -p 8001:8001 redis/redis-stack:latest

# 3. Start the Next.js development server
npm run dev

# 4. Open a SECOND terminal and start the background worker!
npm run worker
```

---

## 🚀 Deploy to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"** -> **"Import"**.
3. Add your Environment Variables in Vercel settings (You will need a hosted Redis service like Upstash for production).
4. Click **Deploy**. Your app will be live with full global WhatsApp sharing!
