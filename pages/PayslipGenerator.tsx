import React, { useState } from 'react';
import { Company } from '../types';
import { calcPayslip } from '../utils/taxEngine';
import { Card, Input, Button } from '../components/Shared';

const fmt  = (n: number) => '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 2 });
const fmtM = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');

interface PayslipGeneratorProps { company: Company; }

interface EmpInput {
  name:        string;
  tin:         string;
  department:  string;
  grossSalary: string;
  annualRent:  string;
}

const empty: EmpInput = { name: '', tin: '', department: '', grossSalary: '', annualRent: '' };

const MONTHS_LIST = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

export const PayslipGenerator: React.FC<PayslipGeneratorProps> = ({ company }) => {
  const now   = new Date();
  const [period, setPeriod] = useState(`${MONTHS_LIST[now.getMonth()]} ${now.getFullYear()}`);
  const [employees, setEmployees] = useState<EmpInput[]>([{ ...empty }]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState('');

  const addEmployee = () => setEmployees(prev => [...prev, { ...empty }]);
  const removeEmployee = (i: number) => setEmployees(prev => prev.filter((_, idx) => idx !== i));
  const updateEmployee = (i: number, field: keyof EmpInput, val: string) =>
    setEmployees(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));

  // Live preview for first employee
  const preview = employees[0]?.grossSalary
    ? calcPayslip(parseFloat(employees[0].grossSalary) || 0, parseFloat(employees[0].annualRent) || 0)
    : null;

  const generatePayslips = async () => {
    const validEmps = employees.filter(e => e.name.trim() && parseFloat(e.grossSalary) > 0);
    if (validEmps.length === 0) { setError('Add at least one employee with a name and gross salary.'); return; }

    setGenerating(true); setError('');
    try {
      const jsPDFModule = await import('jspdf').catch(() => null);
      const autoTableModule = await import('jspdf-autotable').catch(() => null);
      if (!jsPDFModule || !autoTableModule) {
        setError('PDF library not installed. Run: npm install jspdf jspdf-autotable');
        return;
      }
      const { jsPDF } = jsPDFModule;
      const GREEN: [number,number,number] = [0, 132, 61];
      const DARK:  [number,number,number] = [30, 41, 59];
      const LGRAY: [number,number,number] = [241, 245, 249];
      const WHITE: [number,number,number] = [255, 255, 255];
      const RED:   [number,number,number] = [220, 38, 38];

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();

      validEmps.forEach((emp, idx) => {
        if (idx > 0) doc.addPage();

        const gross   = parseFloat(emp.grossSalary) || 0;
        const rent    = parseFloat(emp.annualRent) || 0;
        const calc    = calcPayslip(gross, rent);

        // ── Header ──
        doc.setFillColor(...GREEN);
        doc.rect(0, 0, W, 38, 'F');
        doc.setTextColor(...WHITE);
        doc.setFontSize(16); doc.setFont('helvetica', 'bold');
        doc.text(company.name, 14, 13);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.text('EMPLOYEE PAYSLIP', 14, 20);
        doc.text(`Period: ${period}`, 14, 27);
        doc.setFontSize(7);
        doc.text('NTA 2025 COMPLIANT -- Deductions per Nigeria Tax Act 2025 & PRA 2014', 14, 34);

        // ── Employee details box ──
        doc.setFillColor(...LGRAY);
        doc.rect(0, 38, W, 22, 'F');
        doc.setTextColor(...DARK);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text(emp.name, 14, 47);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        const empInfo = [
          emp.department ? `Dept: ${emp.department}` : '',
          emp.tin ? `TIN: ${emp.tin}` : '',
          `Employer TIN: ${company.tin || '--'}`,
          `RC No: ${company.rcNumber || '--'}`,
        ].filter(Boolean).join('   ·   ');
        doc.text(empInfo, 14, 54);
        doc.text(`Page 1 of 1`, W - 14, 54, { align: 'right' });

        let y = 68;

        // ── Earnings ──
        doc.setTextColor(...GREEN); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.text('EARNINGS', 14, y);
        doc.setDrawColor(...GREEN); doc.setLineWidth(0.4);
        doc.line(14, y + 2, W - 14, y + 2);
        y += 6;

        (doc as any).autoTable({
          startY: y,
          head: [['Component', 'Calculation', 'Amount (₦)']],
          body: [
            ['Basic Salary (60% of gross)',      '60% × ' + fmtM(gross), fmtM(calc.basicSalary)],
            ['Housing Allowance (20%)',           '20% × ' + fmtM(gross), fmtM(calc.housing || 0)],
            ['Transport Allowance (10%)',         '10% × ' + fmtM(gross), fmtM(calc.transport || 0)],
            ['Other Allowances (10%)',            '10% × ' + fmtM(gross), fmtM(gross * 0.10)],
            ['GROSS SALARY',                      '',                      fmtM(gross)],
          ],
          theme: 'grid',
          headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
          bodyStyles: { fontSize: 8.5, textColor: DARK },
          alternateRowStyles: { fillColor: LGRAY },
          columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
          margin: { left: 14, right: 14 },
          didDrawRow: (data: any) => {
            if (data.row.index === 4) {
              doc.setFillColor(...GREEN);
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        // ── Deductions ──
        doc.setTextColor(...RED); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.text('STATUTORY DEDUCTIONS', 14, y);
        doc.setDrawColor(...RED); doc.setLineWidth(0.4);
        doc.line(14, y + 2, W - 14, y + 2);
        y += 6;

        const annualRentRelief = Math.min(rent * 0.20, 500_000);

        (doc as any).autoTable({
          startY: y,
          head: [['Deduction', 'Basis (NTA 2025)', 'Amount (₦)']],
          body: [
            ['Pension (Employee 8%)',    '8% × gross salary',               fmtM(calc.pension)],
            ['NHIS (1.5%)',              '1.5% × gross salary',             fmtM(calc.nhis)],
            ['NHF (2.5% of basic)',      '2.5% × basic salary',             fmtM(calc.nhf)],
            ['PAYE (NTA 2025 bands)',    `Tax on annual equivalent. Rent relief: ${fmtM(annualRentRelief / 12)}/mo`, fmtM(calc.paye)],
            ['TOTAL DEDUCTIONS',        '',                                   fmtM(calc.totalDeductions)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [190, 30, 30] as [number,number,number], textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
          bodyStyles: { fontSize: 8.5, textColor: DARK },
          alternateRowStyles: { fillColor: LGRAY },
          columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        // ── Employer contributions (informational) ──
        doc.setTextColor(100, 116, 139); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text('EMPLOYER CONTRIBUTIONS (not deducted from your pay)', 14, y);
        doc.setDrawColor(200, 200, 200); doc.line(14, y + 2, W - 14, y + 2);
        y += 6;

        (doc as any).autoTable({
          startY: y,
          head: [['Contribution', 'Rate', 'Amount (₦)']],
          body: [
            ['Employer Pension (10%)',  '10% × gross',  fmtM(calc.employerPension)],
            ['NSITF (1%)',             '1% × gross',   fmtM(calc.nsitf)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [150, 150, 150] as [number,number,number], textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: DARK },
          alternateRowStyles: { fillColor: LGRAY },
          columnStyles: { 2: { halign: 'right' } },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 10;

        // ── Net Pay box ──
        doc.setFillColor(...GREEN);
        doc.roundedRect(14, y, W - 28, 20, 3, 3, 'F');
        doc.setTextColor(...WHITE);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('NET PAY (Take-Home)', 20, y + 8);
        doc.setFontSize(14);
        doc.text(fmtM(calc.netPay), W - 20, y + 12, { align: 'right' });
        y += 28;

        // ── NTA 2025 band reference ──
        doc.setFillColor(...LGRAY);
        doc.roundedRect(14, y, W - 28, 30, 3, 3, 'F');
        doc.setTextColor(...DARK); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        doc.text('PAYE computed per NTA 2025 bands (effective 1 Jan 2026): 0% on first ₦800k · 15% next ₦2.2M · 18% next ₦9M · 21% next ₦13M · 23% next ₦25M · 25% above ₦50M annual.', 18, y + 7, { maxWidth: W - 36 });
        doc.text(`CRA abolished -- replaced by Rent Relief: 20% of annual rent paid, max ₦500,000/year.  Pension per PRA 2014.  NHF per NHFRS Act.`, 18, y + 16, { maxWidth: W - 36 });
        doc.text(`${company.name}  ·  TIN: ${company.tin || 'N/A'}  ·  RC: ${company.rcNumber || 'N/A'}  ·  Generated: ${new Date().toLocaleDateString('en-NG')}`, 18, y + 24, { maxWidth: W - 36 });
        y += 38;

        // ── Signature lines ──
        doc.setFontSize(8); doc.setTextColor(...DARK);
        doc.text('Employee Signature: _______________________________', 14, y);
        doc.text('HR / Payroll Officer: _______________________________', W / 2 + 5, y);
        doc.text('Date: __________________', 14, y + 10);
        doc.text('Stamp / Seal:', W / 2 + 5, y + 10);

        // ── Page footer ──
        const H = doc.internal.pageSize.getHeight();
        doc.setFillColor(...GREEN); doc.rect(0, H - 10, W, 10, 'F');
        doc.setTextColor(...WHITE); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        doc.text(`TaxPulse NG  ·  NTA 2025 Compliant Payslip  ·  ${company.name}  ·  ${period}`, W / 2, H - 4, { align: 'center' });
      });

      const filename = `TaxPulse_Payslips_${company.name.replace(/\s+/g,'_')}_${period.replace(/\s+/g,'_')}.pdf`;
      doc.save(filename);
      setGenerated(true);
      setTimeout(() => setGenerated(false), 4000);
    } catch (e: any) {
      setError(`Failed: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Build period options
  const periodOptions: string[] = [];
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) {
    MONTHS_LIST.forEach(m => periodOptions.push(`${m} ${y}`));
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">Payslip Generator</h1>
          <span className="bg-cac-green text-white text-xs font-black px-2.5 py-1 rounded-full">NTA 2025</span>
        </div>
        <p className="text-slate-500 text-sm">
          Generate statutory-compliant payslips with NTA 2025 PAYE, pension (8%), NHIS (1.5%), NHF (2.5%) deductions. Download as PDF to give each employee.
        </p>
      </header>

      {/* Education banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1">
        <p className="font-bold">📋 What a legal Nigerian payslip must show (NTA 2025 + PRA 2014)</p>
        <div className="grid md:grid-cols-2 gap-1 mt-1">
          <p>• Gross salary and breakdown (basic, housing, transport)</p>
          <p>• PAYE deducted per NTA 2025 progressive bands</p>
          <p>• Pension: 8% employee + 10% employer (PRA 2014)</p>
          <p>• NHF: 2.5% of basic salary (NHFRS Act)</p>
          <p>• NHIS: 1.5% employee contribution</p>
          <p>• Net pay (take-home)</p>
          <p>• Employer TIN and RC Number</p>
          <p>• Employee TIN (required for PAYE filing)</p>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Employee inputs */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Employees ({employees.length})</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Period:</label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cac-green bg-white"
              >
                {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {employees.map((emp, i) => (
            <Card key={i} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-800 text-sm">Employee {i + 1}</p>
                {employees.length > 1 && (
                  <button onClick={() => removeEmployee(i)} className="text-xs text-red-500 hover:text-red-700 font-semibold">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Full Name *" value={emp.name} onChange={e => updateEmployee(i, 'name', e.target.value)} placeholder="e.g. Amaka Okafor" />
                <Input label="Department" value={emp.department} onChange={e => updateEmployee(i, 'department', e.target.value)} placeholder="e.g. Finance" />
                <Input label="TIN (if available)" value={emp.tin} onChange={e => updateEmployee(i, 'tin', e.target.value)} placeholder="e.g. 12345678-0001" />
                <Input label="Gross Monthly Salary (₦) *" type="number" value={emp.grossSalary} onChange={e => updateEmployee(i, 'grossSalary', e.target.value)} placeholder="e.g. 500000" />
                <div className="col-span-2">
                  <Input label="Annual Rent Paid (₦) -- for rent relief calculation" type="number" value={emp.annualRent} onChange={e => updateEmployee(i, 'annualRent', e.target.value)} placeholder="e.g. 600000 (optional)" />
                  <p className="text-xs text-slate-400 mt-1">Rent relief = 20% of annual rent, max ₦500k -- reduces PAYE liability</p>
                </div>
              </div>

              {/* Live deductions preview */}
              {i === 0 && emp.grossSalary && parseFloat(emp.grossSalary) > 0 && preview && (
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live calculation preview</p>
                  {[
                    ['Pension (8%)',        fmtM(preview.pension),          'text-purple-600'],
                    ['NHIS (1.5%)',         fmtM(preview.nhis),             'text-indigo-600'],
                    ['NHF (2.5% basic)',    fmtM(preview.nhf),              'text-blue-600'],
                    ['PAYE (NTA 2025)',     fmtM(preview.paye),             'text-red-600'],
                    ['Total deductions',   fmtM(preview.totalDeductions),  'text-slate-700 font-bold'],
                    ['Net take-home',      fmtM(preview.netPay),           'text-cac-green font-black'],
                  ].map(([label, val, cls]) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-slate-500">{label}</span>
                      <span className={cls as string}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}

          <button
            onClick={addEmployee}
            className="w-full py-2.5 border-2 border-dashed border-cac-green/30 rounded-xl text-cac-green text-sm font-bold hover:border-cac-green hover:bg-cac-green/5 transition-all"
          >
            + Add Another Employee
          </button>
        </div>

        {/* Info panel */}
        <div className="md:col-span-2 space-y-4">
          <Card className="space-y-3">
            <h2 className="font-bold text-slate-800">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Employer</span>
                <span className="font-bold text-slate-800">{company.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Period</span>
                <span className="font-bold text-slate-800">{period}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Employees</span>
                <span className="font-bold text-slate-800">{employees.filter(e => e.name && e.grossSalary).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total payroll</span>
                <span className="font-bold text-cac-green">
                  {fmt(employees.reduce((s, e) => s + (parseFloat(e.grossSalary) || 0), 0))}
                </span>
              </div>
            </div>
          </Card>

          <Card className="space-y-2 text-xs text-slate-500">
            <p className="font-bold text-slate-700 text-sm">Statutory rates (NTA 2025)</p>
            {[
              ['Pension -- employee', '8% of gross'],
              ['Pension -- employer', '10% of gross (info only)'],
              ['NHIS', '1.5% of gross'],
              ['NHF', '2.5% of basic salary'],
              ['NSITF', '1% of gross (employer)'],
              ['PAYE', '0%-25% (NTA 2025 bands)'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span>{label}</span>
                <span className="font-bold text-slate-700">{val}</span>
              </div>
            ))}
          </Card>

          <Card className="text-xs text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">After generating payslips:</p>
            <p>1. Give each employee their payslip</p>
            <p>2. File PAYE with State IRS by 10th</p>
            <p>3. Remit pension to PFAs within 7 days</p>
            <p>4. Remit NHF to FMBN by 1st of next month</p>
            <p>5. Remit NSITF by 16th of next month</p>
          </Card>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <p className="font-bold">⚠️ {error}</p>
        </div>
      )}

      {generated && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-cac-green font-bold flex items-center gap-2">
          ✅ Payslips downloaded! Give each employee their copy and file PAYE with State IRS by the 10th.
        </div>
      )}

      <Button onClick={generatePayslips} disabled={generating} className="w-full py-4 text-base">
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating payslips...
          </span>
        ) : (
          `📄 Generate ${employees.filter(e => e.name && e.grossSalary).length || 0} Payslip${employees.length > 1 ? 's' : ''} -- ${period}`
        )}
      </Button>

      <p className="text-xs text-slate-400 text-center">
        All calculations use NTA 2025 PAYE bands, PRA 2014 pension rates, and NHFRS Act. Generated entirely in your browser.
      </p>
    </div>
  );
};
