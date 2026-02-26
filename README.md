# Smart Hospital Operations & Facility ERP

A full-stack, real-time hospital management system with 15 integrated modules, role-based access control, and AI-powered analytics.

## 🏥 Features

### 15 Core Modules
| Module | Description |
|--------|-------------|
| **OPD** | Patient registration, token queue, appointments |
| **ICU & Beds** | Real-time bed management with ward-wise occupancy |
| **Emergency** | Triage case management with priority classification |
| **OT Scheduling** | Surgery scheduling with conflict detection |
| **Lab Tracking** | Sample lifecycle tracking with barcode system |
| **Pharmacy** | Medicine inventory, prescriptions, stock alerts |
| **Blood Bank** | Blood inventory by group, donor & request management |
| **Transport** | Internal patient transport queue |
| **Nursing Roster** | Shift scheduling, leave management, shift swaps |
| **Ambulance** | Fleet management, dispatch tracking, GPS simulation |
| **Billing** | Auto-generated bills, payments, insurance claims |
| **HR & Staff** | Staff records, biometric attendance, payroll |
| **Equipment** | Biomedical equipment registry & maintenance tickets |
| **Laundry** | Linen tracking & sanitation task management |
| **Analytics** | KPI dashboard, charts, AI predictions |

### Key Capabilities
- 🔐 JWT authentication with **9 user roles** (Admin, Doctor, Nurse, Receptionist, Lab Tech, Pharmacist, Maintenance, Driver, Patient)
- ⚡ Real-time updates via **Socket.io**
- 📊 Interactive charts with **Recharts**
- 🌙 Dark mode support
- 📱 Responsive design
- 🔍 Audit logging for all operations
- 🤖 Basic AI-powered predictions

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js, Socket.io |
| Database | MongoDB + Mongoose |
| Auth | JWT with refresh tokens |
| Deployment | Docker + Docker Compose |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm/yarn

### 1. Clone & Install

```bash
git clone <repo-url>
cd smart-hospital-erp

# Backend
cd backend
npm install
cp .env.example .env   # Edit with your MongoDB URI

# Frontend
cd ../frontend
npm install
```

### 2. Seed Database
```bash
cd backend
node seeds/index.js
```

### 3. Run Development Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev    # http://localhost:5000

# Terminal 2 - Frontend
cd frontend
npm run dev    # http://localhost:3000
```

### 4. Login
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hospital.com | password123 |

> **Note:** For security, only the Admin user is created by default. Log in as Admin to create accounts for Doctors, Nurses, Receptionists, Lab Techs, Pharmacists, Maintenance staff, Drivers, and Patients.

### Docker Deployment
```bash
docker-compose up -d
```

## 📁 Project Structure

```
smart-hospital-erp/
├── backend/
│   ├── config/          # DB & Socket.io config
│   ├── middleware/       # Auth, RBAC, Audit, Validation
│   ├── models/          # 15 Mongoose models
│   ├── routes/          # 17 route files
│   ├── seeds/           # Database seeding
│   └── server.js        # Express app entry
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── dashboard/   # 15 module pages
│       │   └── page.js      # Login page
│       ├── contexts/    # Auth & Socket contexts
│       └── lib/         # API client
└── docker-compose.yml
```

## 📖 API Documentation

Swagger docs available at: `http://localhost:5000/api/docs`
