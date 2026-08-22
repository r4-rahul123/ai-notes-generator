# 🎓 AI Notes Generator - Next.js 16 SaaS Application

AI-powered comprehensive study companion that turns topics, complex concepts, and PDF textbooks into structured notes, executive summaries, revision flashcards, visual Mermaid flowcharts, and interactive practice MCQ tests with PDF downloads and public sharing.

---

## 🌟 Key Features

1. **🤖 Dual AI Engine with Auto-Fallback (Gemini 3.5)**:
   - Primary: `gemini-3.5-flash` for lightning-fast rich note generation.
   - Secondary Fallback: `gemini-3.5-flash-lite` auto-activated on 429 quota exhaustion.
   - Robust 5-tier fail-safe JSON parser (`jsonrepair` + regex recovery).

2. **📊 Interactive Dashboard & Student Study Analytics**:
   - Real-time statistics: Total Notes Created, Quiz Average Accuracy %, Tests Taken, and Visual Flowcharts Mastered.
   - Live search by title, topic, or keyword.
   - Category / Class level filter chips (`All`, `School`, `College`, `Competitive Exams`).
   - Dynamic sorting: *Newest First*, *Oldest First*, *Highest Quiz Score*, and *Title (A-Z)*.

3. **🔗 1-Click Shareable Public Study Links & WhatsApp**:
   - Public view route (`/share/[id]`) allows anyone to study, practice MCQs, and download PDFs without logging in.
   - Compact share modal with 1-click URL copy and pre-formatted WhatsApp chat message.

4. **❓ Important Exam Questions & Live AI Answers**:
   - Generates high-yield exam questions with model answers.
   - On-demand AI answer generator for custom questions.

5. **🏆 Interactive MCQ Practice & Quiz History**:
   - 5-6 questions per test with instant feedback and score cards.
   - Quiz history tracking with score progression.
   - AI dynamic test regenerator for fresh questions.

6. **🧠 Grounded RAG Vector Note Chat**:
   - Chat with your study notes using cosine similarity search on stored embeddings.

7. **📄 Premium Server-Side PDF Exporter**:
   - Clean slate-themed design with auto-wrapping grid tables.
   - Dark IDE code containers with Courier font and window dots.
   - Multi-page auto-repeating table headers.

---

## 📁 File Structure & System Architecture

```text
ai_notes_generator/
├── src/
│   ├── app/                               # Next.js App Router
│   │   ├── api/                           # Backend API Endpoints
│   │   │   ├── answer-question/           # On-demand AI question answers
│   │   │   ├── chat/                      # Grounded RAG vector note chat
│   │   │   ├── generate/                  # Full study note generation engine
│   │   │   ├── mock-payment/              # Credit purchase mock checkout
│   │   │   ├── notes/[id]/mcq/new/        # Fresh MCQ test regenerator
│   │   │   ├── notes/[id]/mcq/submit/     # MCQ test score tracker
│   │   │   ├── notes/[id]/pdf/            # Server-side PDF export engine
│   │   │   ├── parse-pdf/                 # PDF document parser
│   │   │   └── razorpay/                  # Payment gateway integration
│   │   ├── dashboard/                     # Authenticated student dashboard
│   │   ├── generate/                      # Note generation studio with progress bar
│   │   ├── notes/[id]/                    # Full study note view & workspace
│   │   ├── pricing/                       # Credit store & plans
│   │   ├── share/[id]/                    # Public shared study page (No login needed)
│   │   ├── sign-in/                       # Clerk Authentication sign-in
│   │   ├── sign-up/                       # Clerk Authentication sign-up
│   │   ├── globals.css                    # Tailwind CSS & stable layout rules
│   │   ├── layout.tsx                     # Root layout with Clerk & Theme Provider
│   │   └── page.tsx                       # Redesigned interactive landing page
│   │
│   ├── components/                        # Modular React Components
│   │   ├── ui/                            # Base UI / Tailwind primitives
│   │   │   ├── button.tsx                 # Base Button with hydration suppression
│   │   │   ├── card.tsx                   # Card containers
│   │   │   ├── input.tsx                  # Base Input with hydration suppression
│   │   │   ├── separator.tsx              # Divider component
│   │   │   ├── sonner.tsx                 # Toast notification wrapper
│   │   │   └── textarea.tsx               # Base Textarea with hydration suppression
│   │   ├── CodeBlock.tsx                  # Syntax highlighted code box with copy button
│   │   ├── DashboardClient.tsx            # Interactive dashboard, analytics & filters
│   │   ├── ImportantQuestionsSection.tsx  # Exam questions with expandable answers
│   │   ├── MCQSection.tsx                 # Practice MCQ quiz with score tracking
│   │   ├── MermaidRenderer.tsx            # SVG flowchart & concept map renderer
│   │   ├── Navbar.tsx                     # Top navigation with credits & theme toggle
│   │   ├── NoteChat.tsx                   # Grounded RAG chat sidebar
│   │   ├── PDFExportButton.tsx            # 1-Click PDF download button
│   │   ├── ShareNoteButton.tsx            # Compact share modal & WhatsApp button
│   │   ├── ThemeProvider.tsx              # next-themes wrapper
│   │   └── ThemeToggle.tsx                # Light/Dark mode toggle button
│   │
│   ├── lib/                               # Core Libraries & Utilities
│   │   ├── models/                        # MongoDB Mongoose Schemas
│   │   │   ├── Note.ts                    # Note schema with Mixed questions & attempts
│   │   │   └── User.ts                    # User schema with credit balance
│   │   ├── gemini.ts                      # Gemini 3.5 multi-model fallback client
│   │   ├── mongoose.ts                    # MongoDB connection caching
│   │   ├── parseAiJson.ts                 # 5-tier fail-safe AI JSON recovery engine
│   │   ├── utils.ts                       # Tailwind merge utility
│   │   └── vectorSearch.ts                # Cosine similarity vector search for RAG
│   │
│   └── middleware.ts                      # Clerk authentication route matcher
│
├── .env.local                             # Environment variables configuration
├── package.json                           # Project dependencies & scripts
├── tsconfig.json                          # TypeScript configuration
└── README.md                              # Project documentation
```

---

## ⚙️ Environment Variables (`.env.local`)

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

# Optional: Public Domain (for live WhatsApp sharing)
# NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

---

## 🌐 Deploy to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"** -> **"Import"**.
3. Add your Environment Variables in Vercel settings.
4. Click **Deploy**. Your app will be live with full global WhatsApp sharing!
