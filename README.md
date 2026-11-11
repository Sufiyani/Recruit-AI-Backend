# RecruitAI — AI Recruitment & Interview Automation SaaS

> **Phase 1 Foundation** — Clean, production-ready backend & frontend. AI modules (Ollama, Whisper, Piper, n8n) plug in during Phase 2 without refactoring.

---

## 🗂️ Project Structure

```
SaaS Project/
├── frontend/        # Next.js 15 App Router + TypeScript + Tailwind
├── backend/         # Express.js + TypeScript + Prisma + PostgreSQL
└── docker-compose.yml
```

---

## 🚀 Quick Start

### Option A — Docker (Recommended)

```bash
# From the project root
docker-compose up --build
```

- Frontend: http://localhost:3000  
- Backend API: http://localhost:5000  
- API Docs (Swagger): http://localhost:5000/api/docs  

---

### Option B — Manual (Local Dev)

**1. Start PostgreSQL** (Docker or local install)

```bash
docker run -d --name recruit_db \
  -e POSTGRES_USER=recruituser \
  -e POSTGRES_PASSWORD=recruitpassword \
  -e POSTGRES_DB=recruitdb \
  -p 5432:5432 postgres:16-alpine
```

**2. Backend**

```bash
cd backend
cp .env.example .env          # Edit DATABASE_URL if needed
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed               # Creates demo users
npm run dev
```

**3. Frontend**

```bash
cd frontend
cp .env.local.example .env.local   # or edit NEXT_PUBLIC_API_URL
npm run dev
```

---

## 🔑 Demo Login Credentials

| Role        | Email                    | Password        |
|-------------|--------------------------|-----------------|
| Super Admin | admin@recruit.com        | Admin@123456    |
| HR Admin    | hr@techcorp.com          | HR@123456       |
| Candidate   | john@candidate.com       | Candidate@123   |

---

## 🏗️ Architecture

### Backend (Express + TypeScript)

```
src/
├── config/           # DB connection, env config
├── controllers/      # HTTP request handlers (thin layer)
├── middlewares/      # Auth, RBAC, validation, upload, error handling
├── routes/v1/        # Versioned REST API routes
├── services/         # Business logic
│   ├── auth.service.ts
│   ├── job.service.ts
│   ├── application.service.ts
│   ├── interview.service.ts
│   ├── notification.service.ts
│   ├── candidate.service.ts
│   ├── company.service.ts
│   ├── dashboard.service.ts
│   └── ai.service.ts      ← Phase 2 stubs
├── validators/        # Zod schemas
└── utils/             # JWT, logger, pagination, errors
```

### Frontend (Next.js 15 App Router)

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── auth/                 # Login & Register
│   ├── jobs/                 # Public job listings + detail
│   ├── hr/                   # HR Dashboard (jobs, applications, interviews...)
│   ├── candidate/            # Candidate Dashboard
│   └── admin/                # Super Admin
├── components/
│   ├── ui/                   # Button, Input, Badge, Modal, Feedback
│   ├── layout/               # Sidebar, Topbar
│   └── providers/            # AuthProvider
├── store/                    # Zustand auth store
├── lib/                      # Axios client, API services, utilities
└── types/                    # TypeScript interfaces
```

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register-company` | Public | Register company + admin |
| POST | `/api/v1/auth/register` | Public | Register candidate |
| POST | `/api/v1/auth/login` | Public | Login |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| GET | `/api/v1/auth/me` | Bearer | Get current user |
| GET | `/api/v1/jobs` | Public | List published jobs |
| POST | `/api/v1/jobs` | HR | Create job |
| PATCH | `/api/v1/jobs/:id/publish` | HR | Toggle publish |
| POST | `/api/v1/applications` | Candidate | Apply for job |
| PATCH | `/api/v1/applications/:id/status` | HR | Update status |
| POST | `/api/v1/interviews` | HR | Schedule interview |
| GET | `/api/v1/dashboard/hr` | HR | HR analytics |
| GET | `/api/v1/notifications` | Auth | User notifications |

Full docs: **http://localhost:5000/api/docs**

---

## 🗄️ Database Models

- **User** — email, password, role (SUPER_ADMIN / COMPANY_ADMIN / CANDIDATE)
- **Company** — name, industry, settings (JSON)
- **Job** — title, description, type, salary, status (DRAFT/PUBLISHED/CLOSED)
- **CandidateProfile** — resume, skills, experience
- **Application** — status (PENDING/REVIEWING/SHORTLISTED/REJECTED)
- **Interview** — scheduledAt, meetingLink, status
- **Notification** — in-app notifications

---

## 🤖 Phase 2 — AI Integration Points

All stubs are in `backend/src/services/ai.service.ts`:

```typescript
aiService.analyzeResume()        → Ollama LLM
aiService.generateQuestions()    → Ollama LLM
aiService.transcribeSpeech()     → Whisper STT
aiService.synthesizeSpeech()     → Piper TTS
aiService.triggerN8nWorkflow()   → n8n Automation
```

---

## 🔧 Environment Variables

### Backend `.env`
```
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SUPER_ADMIN_EMAIL=admin@recruit.com
SUPER_ADMIN_PASSWORD=Admin@123456
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_NAME=RecruitAI
```

---

## 🛡️ Security Features

- JWT Access + Refresh token rotation
- bcrypt password hashing (12 rounds)
- Helmet HTTP headers
- CORS with origin whitelist
- Rate limiting (20 req/15min on auth routes)
- Input validation via Zod
- Role-based access control (RBAC)
