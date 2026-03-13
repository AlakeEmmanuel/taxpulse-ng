import { Company, TaxObligation, LedgerEntry, EvidenceFile } from '../types';
import { MOCK_COMPANIES, MOCK_OBLIGATIONS } from '../constants';

class MockDB {
  private companies: Company[] = [...MOCK_COMPANIES];
  private obligations: TaxObligation[] = [...MOCK_OBLIGATIONS];
  private ledgers: LedgerEntry[] = [];
  private evidenceFiles: EvidenceFile[] = [];

  // ─── Companies ─────────────────────────────────────────────────────────────
  getCompanies() { return this.companies; }
  getCompany(id: string) { return this.companies.find(c => c.id === id); }
  addCompany(company: Company) { this.companies.push(company); }
  updateCompany(updated: Company) {
    this.companies = this.companies.map(c => c.id === updated.id ? updated : c);
  }

  // ─── Obligations ───────────────────────────────────────────────────────────
  getObligations(companyId?: string) {
    return companyId
      ? this.obligations.filter(o => o.companyId === companyId)
      : this.obligations;
  }
  updateObligation(id: string, updates: Partial<TaxObligation>) {
    this.obligations = this.obligations.map(o =>
      o.id === id ? { ...o, ...updates } : o
    );
  }

  // ─── Ledger ────────────────────────────────────────────────────────────────
  getLedgers(companyId: string) {
    return this.ledgers.filter(l => l.companyId === companyId);
  }
  addLedgerEntry(entry: LedgerEntry) {
    this.ledgers.push(entry);
  }
  updateLedgerEntry(id: string, updates: Partial<LedgerEntry>) {
    this.ledgers = this.ledgers.map(l => l.id === id ? { ...l, ...updates } : l);
  }

  // ─── Evidence Vault ────────────────────────────────────────────────────────
  getEvidence(companyId: string) {
    return this.evidenceFiles.filter(e => e.companyId === companyId);
  }
  getEvidenceForObligation(obligationId: string) {
    return this.evidenceFiles.filter(e => e.obligationId === obligationId);
  }
  getEvidenceForLedger(ledgerEntryId: string) {
    return this.evidenceFiles.filter(e => e.ledgerEntryId === ledgerEntryId);
  }
  addEvidence(file: EvidenceFile) {
    this.evidenceFiles.push(file);
  }
  deleteEvidence(id: string) {
    this.evidenceFiles = this.evidenceFiles.filter(e => e.id !== id);
  }
}

export const db = new MockDB();
