
import React from 'react';
import { EntityType, Company, TaxType, TaxStatus, TaxObligation } from './types';

export const APP_NAME = "TaxPulse NG";

// ─── NTA 2025 Tax Law Summary (effective 1 January 2026) ─────────────────────
// Signed by President Bola Tinubu, 26 June 2025.
// Four acts: Nigeria Tax Act 2025 (NTA), Nigeria Tax Administration Act 2025 (NTAA),
// Nigeria Revenue Service Act 2025 (NRSA), Joint Revenue Board Act 2025 (JRBA).
// Key changes: CRA abolished, new PAYE bands 0-25%, CIT small threshold ₦50M,
// 4% Dev Levy, VAT threshold ₦100M, FIRS renamed NRS.
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_COMPANIES: Company[] = [
  {
    id: '1',
    name: 'SwiftLogistics Ltd',
    entityType: EntityType.LTD,
    industry: 'Logistics',
    state: 'Lagos',
    address: '12 Admiralty Way, Lekki Phase 1',
    cacStatus: 'Registered',
    rcNumber: 'RC1234567',
    tin: '22345678-0001',
    yearEnd: 'December 31',
    hasEmployees: true,
    employeeCount: 15,
    paysVendors: true,
    collectsVat: true,
    complianceScore: 85
  },
  {
    id: '2',
    name: 'GreenEarth Agro',
    entityType: EntityType.BUSINESS_NAME,
    industry: 'Agriculture',
    state: 'Ogun',
    address: 'KM 5 Ibadan Road, Abeokuta',
    cacStatus: 'Registered',
    rcNumber: 'BN987654',
    tin: '11987654-0001',
    yearEnd: 'March 31',
    hasEmployees: false,
    paysVendors: true,
    collectsVat: false,
    complianceScore: 60
  }
];

export const MOCK_OBLIGATIONS: TaxObligation[] = [
  {
    id: 'ob1',
    companyId: '1',
    type: TaxType.VAT,
    period: 'Jan 2026',
    dueDate: '2026-02-21',
    status: TaxStatus.FILED,
    estimatedAmount: 150000,
    actualAmount: 145000,
    paymentDate: '2026-02-18',
    checklist: [
      { label: 'Summarize Sales', completed: true },
      { label: 'Deduct Input VAT (NTA 2025 — expanded recovery)', completed: true },
      { label: 'Upload to NRS Portal (formerly FIRS)', completed: true }
    ]
  },
  {
    id: 'ob2',
    companyId: '1',
    type: TaxType.PAYE,
    period: 'Feb 2026',
    dueDate: '2026-03-10',
    status: TaxStatus.DUE,
    estimatedAmount: 85000,
    checklist: [
      { label: 'Review Payroll (NTA 2025 bands)', completed: true },
      { label: 'Generate PAYE Schedule (no CRA — use Rent Relief)', completed: false },
      { label: 'Remit to State IRS by 10th', completed: false }
    ]
  },
  {
    id: 'ob3',
    companyId: '1',
    type: TaxType.WHT,
    period: 'Feb 2026',
    dueDate: '2026-03-21',
    status: TaxStatus.UPCOMING,
    estimatedAmount: 45000,
    checklist: [
      { label: 'Vendor Transaction List', completed: false },
      { label: 'Check ₦2M/month TIN exemption (NTA 2025)', completed: false },
      { label: 'Remit to NRS by 21st', completed: false }
    ]
  },
  {
    id: 'ob4',
    companyId: '1',
    type: TaxType.CIT,
    period: 'FY 2025',
    dueDate: '2026-06-30',
    status: TaxStatus.UPCOMING,
    estimatedAmount: 0,
    checklist: [
      { label: 'Confirm turnover threshold (≤₦50M = exempt under NTA 2025)', completed: false },
      { label: 'Calculate 4% Development Levy if applicable', completed: false },
      { label: 'File with NRS within 6 months of year-end', completed: false }
    ]
  }
];
