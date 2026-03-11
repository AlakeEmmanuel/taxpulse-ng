
# TaxPulse NG - Nigeria Tax Companion

A production-ready tax compliance dashboard and management tool for Nigerian businesses, heavily inspired by the Corporate Affairs Commission (CAC) visual identity.

## Architecture
- **Frontend**: React 18 with TypeScript.
- **Styling**: Tailwind CSS (Mobile-first, Responsive).
- **Theme**: Derived from `cac.gov.ng` (Primary Green: `#00843D`, Red: `#E4002B`).
- **Data Persistence**: Mock DB service (Simulated multi-tenant backend).
- **Visuals**: Lucide-inspired emojis & Recharts for compliance tracking.

## Core Features
1. **Multi-Tenant Onboarding**: Register multiple companies (LTD, PLC, NGO, etc.) with custom settings.
2. **Tax Calendar**: Automated monthly/annual due dates for VAT, WHT, PAYE, and CIT.
3. **Calculators**: 
   - VAT (7.5%)
   - Simplified PAYE Graduated Tax Engine.
   - Net/Gross VAT calculators.
4. **Evidence Vault**: Document organization by tax type and period.
5. **Compliance Score**: Real-time visual feedback on filing health.

## Extracted CAC Color Palette
- **Primary Green**: `#00843D` (Buttons, headers, success states)
- **Secondary Red**: `#E4002B` (Overdue warnings, alerts)
- **Primary Gold**: `#B58D3D` (Accents, seals)
- **Neutral White**: `#FFFFFF` (Card backgrounds)
- **Soft Background**: `#F8FAFC` (Modern workspace feel)

## Setup Instructions
1. Install dependencies: `npm install`.
2. Start the development server: `npm start`.
3. Open `http://localhost:3000` to view the app.

## Phase 2 Roadmap
- **E-Filing Integration**: Direct API connection to FIRS TaxPRO Max.
- **Bank Feeds**: Automated ledger entry from NGN bank accounts.
- **AI Assistant**: Gemini-powered tax chat for Nigerian Finance Act queries.
- **WhatsApp Bot**: Reminder & filing receipt capture via WhatsApp Business.
