# ClinicOS - Universal Clinic Operating System

**Phase 01: Foundation Architecture** ✅

A modern, healthcare-focused clinic operating system designed for efficiency, security, and scalability. Specialty-agnostic, multi-tenant, multi-location support.

## 🏗️ Architecture

```
Frontend (Next.js 15)  →  API (NestJS)  →  Database (PostgreSQL)
                            ↓
                        Prisma ORM + RLS
                            ↓
                      Multi-Tenant Foundation
```

### Key Principles

- **Specialty-Agnostic Core:** Works with any medical specialty
- **Multi-Tenant:** Complete data isolation by organization
- **Multi-Location:** Support for multiple clinic locations
- **Security-First:** Three-layer tenant isolation
- **Type-Safe:** TypeScript throughout
- **Workflow-First:** State machines for clinic operations

## 📂 Project Structure

```
clinicos/
├── apps/
│   ├── api/              # NestJS Backend
│   │   └── src/
│   │       ├── modules/  # Feature modules
│   │       ├── main.ts   # Bootstrap
│   │       └── app.module.ts
│   └── web/              # Next.js Frontend
│       └── src/
│           ├── app/      # App Router pages
│           └── components/
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   ├── database/         # Prisma schema & migrations
│   ├── auth/             # Auth utilities (future)
│   └── config/           # Configuration (future)
├── .github/workflows/    # CI/CD
└── docker-compose.yml    # Local development
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (https://nodejs.org/)
- **pnpm** 8+ (`npm install -g pnpm`)
- **Docker & Docker Compose** (https://www.docker.com/)
- **PostgreSQL** 15+ (via Docker)

### Development Setup

1. **Clone & Install:**
   ```bash
   cd clinicos
   pnpm install
   ```

2. **Start Services:**
   ```bash
   pnpm docker:up    # Start PostgreSQL + Redis
   ```

3. **Setup Database:**
   ```bash
   pnpm db:migrate   # Run migrations
   pnpm db:seed      # Seed development data
   ```

4. **Start Development Servers:**
   ```bash
   pnpm dev          # Frontend (http://localhost:3000) + Backend (http://localhost:3001)
   ```

5. **Access the Application:**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001/api/v1
   - Health: http://localhost:3001/api/v1/health

### Development Credentials

```
Owner:
  Email: owner@dev.local
  Password: dev_password_123

Doctor:
  Email: doctor@dev.local
  Password: dev_password_123

Receptionist:
  Email: receptionist@dev.local
  Password: dev_password_123
```

## 🛠️ Common Commands

### Development

```bash
# Development servers (both frontend & backend)
pnpm dev

# Type checking across all packages
pnpm type-check

# Linting
pnpm lint

# Build all packages
pnpm build

# Database operations
pnpm db:migrate      # Apply pending migrations
pnpm db:seed         # Seed development data
pnpm db:reset        # Reset database (DELETE ALL DATA)

# Docker operations
pnpm docker:up       # Start containers
pnpm docker:down     # Stop containers
pnpm docker:logs     # View container logs
```

### Individual Packages

```bash
# Backend (NestJS)
cd apps/api
pnpm dev             # Start dev server
pnpm build           # Build production bundle
pnpm test            # Run tests

# Frontend (Next.js)
cd apps/web
pnpm dev             # Start dev server
pnpm build           # Build production bundle
pnpm type-check      # Type check

# Shared types
cd packages/shared-types
pnpm build           # Build TypeScript definitions
```

## 🔐 Security

### Multi-Tenant Isolation

Data isolation is enforced at three layers:

1. **Application Layer:** Middleware extracts organization context from JWT
2. **Service Layer:** TypeScript requires `organizationId` parameter
3. **Database Layer:** PostgreSQL Row-Level Security (RLS) policies

### Authentication

- **JWT Tokens:** Access tokens (15 min) + refresh tokens (7 days)
- **Passport.js:** Strategy-based authentication
- **Password Hashing:** bcryptjs with 12 rounds

### Authorization

- **RBAC:** Role-based access control with flexible permissions
- **Server-Side:** All authorization decisions on backend
- **Framework Guards:** NestJS Guards enforce access control

## 🗄️ Database

### Schema Layers

**Core (Phase 01):**
- Organizations (multi-tenant root)
- Locations (multi-location support)
- Departments (specialty units)
- Users (with roles & permissions)

**Future (Phase 02+):**
- Patients
- Appointments
- Visits & Medical Records
- Billing & Payments
- Communications

### Migrations

All database changes are version-controlled in `packages/database/prisma/migrations/`.

```bash
# Create new migration
pnpm db:migrate

# Reset everything (development only)
pnpm db:reset
```

## 📦 Technology Stack

### Frontend
- **Framework:** Next.js 15 (React 19)
- **UI:** Radix UI + Tailwind CSS
- **Forms:** React Hook Form + Zod
- **State:** TanStack Query (React Query)
- **API:** Axios-based HTTP client
- **Language:** TypeScript

### Backend
- **Framework:** NestJS
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** JWT + Passport.js
- **Validation:** Class Validator + Zod
- **Language:** TypeScript

### Infrastructure
- **Runtime:** Node.js
- **Package Manager:** pnpm
- **Monorepo:** Turborepo structure
- **Containerization:** Docker
- **CI/CD:** GitHub Actions

## 📋 Phase 01 Completed

✅ **Architecture & Planning**
- Specialty-agnostic Core design
- Multi-tenant foundation
- Multi-location support
- Security architecture (3-layer isolation)

✅ **Backend Foundation (NestJS)**
- Project structure
- Prisma ORM integration
- JWT Authentication
- RBAC foundation
- Health check endpoint
- User, Organization, Auth modules

✅ **Frontend Foundation (Next.js)**
- Project structure
- Component library setup (Radix UI)
- Styling (Tailwind CSS v4)
- Layout system
- Login page
- Home page

✅ **Database Foundation**
- Prisma schema (organizations, locations, departments, users, roles, permissions)
- Initial migration
- Seed script with development data

✅ **Development Environment**
- Docker Compose (PostgreSQL + Redis)
- Environment configuration
- pnpm monorepo setup

✅ **CI/CD**
- GitHub Actions workflow
- Type checking
- Linting
- Build process

## 🎯 Next Phases

- **Phase 02:** Authentication & Access Control (login flow, permissions enforcement)
- **Phase 03:** Patient Management (CRUD + search)
- **Phase 04:** Appointment Scheduling (calendar, state machine)
- **Phase 05:** Queue Management (live updates, check-in)

See `CLINICOS_PHASE_00_ARCHITECTURE.md` for complete development roadmap.

## 🧪 Testing

### Type Checking
```bash
pnpm type-check
```

### Linting
```bash
pnpm lint
```

### Building
```bash
pnpm build
```

### Health Check
```bash
curl http://localhost:3001/api/v1/health
```

## 📝 API Documentation

### Authentication

**Login:**
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "owner@dev.local",
  "password": "dev_password_123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

### Health Check

```bash
GET /api/v1/health

# Response
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "0.0.1"
}
```

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Restart containers
pnpm docker:down && pnpm docker:up
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000     # Frontend
lsof -i :3001     # Backend
lsof -i :5432     # PostgreSQL

# Kill process
kill -9 <PID>
```

### Type Errors

```bash
# Regenerate Prisma Client
cd packages/database
pnpm prisma generate

# Rebuild everything
pnpm build
```

## 📚 Documentation

- **Architecture:** See `CLINICOS_PHASE_00_ARCHITECTURE.md`
- **API Types:** See `packages/shared-types/src/`
- **Database Schema:** See `packages/database/prisma/schema.prisma`
- **Backend Modules:** See `apps/api/src/modules/`
- **Frontend Pages:** See `apps/web/src/app/`

## 🔗 Links

- **GitHub:** (awaiting repository)
- **Issues & Discussions:** (GitHub issues)
- **Team:** ClinicOS Development Team

## 📄 License

Proprietary - ClinicOS

---

**Phase 01 Status:** ✅ COMPLETE

**Next:** Phase 02 - Authentication & Access Control

**Last Updated:** August 2026
