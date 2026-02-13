/**
 * Quote PDF Generation
 *
 * Generates a professional PDF quote document using the built-in
 * HTML-to-PDF approach via Next.js API route + Puppeteer,
 * or a lightweight approach using jsPDF for client-side generation.
 *
 * This module provides the HTML template and data formatting.
 */

interface QuotePdfData {
  quoteNumber: string;
  title: string;
  status: string;
  validUntil?: string;
  notes?: string;
  termsConditions?: string;
  company?: {
    name: string;
    addressLine1?: string;
    city?: string;
    postcode?: string;
    phone?: string;
    email?: string;
  };
  contact?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  lineItems: {
    description: string;
    productType: string;
    dimensions?: string;
    finishType?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  createdBy?: string;
}

export function generateQuoteHtml(data: QuotePdfData): string {
  const itemRows = data.lineItems
    .map(
      (item, idx) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${idx + 1}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">
        <strong>${escapeHtml(item.description)}</strong>
        ${item.dimensions ? `<br/><span style="color:#6b7280;font-size:12px;">${escapeHtml(item.dimensions)}</span>` : ""}
        ${item.finishType ? `<br/><span style="color:#6b7280;font-size:12px;">Finish: ${escapeHtml(item.finishType)}</span>` : ""}
      </td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">$${item.unitPrice.toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">$${item.lineTotal.toFixed(2)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f2937; margin: 0; padding: 40px; font-size: 14px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: 700; color: #c2410c; }
    .logo-sub { font-size: 12px; color: #6b7280; }
    .quote-badge { background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 8px; font-weight: 600; }
    .customer-info { margin-bottom: 30px; display: flex; gap: 60px; }
    .info-block p { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f9fafb; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
    .totals { margin-top: 20px; margin-left: auto; width: 280px; }
    .totals tr td { padding: 6px 0; }
    .totals .grand-total td { font-size: 18px; font-weight: 700; border-top: 2px solid #1f2937; padding-top: 12px; color: #c2410c; }
    .notes { margin-top: 40px; padding: 16px; background: #f9fafb; border-radius: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Joinery ERP</div>
      <div class="logo-sub">Custom Joinery Design & Manufacturing</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:20px;font-weight:700;">${escapeHtml(data.quoteNumber)}</div>
      <div class="quote-badge">${escapeHtml(data.status)}</div>
      ${data.validUntil ? `<div style="margin-top:8px;font-size:12px;color:#6b7280;">Valid until: ${escapeHtml(data.validUntil)}</div>` : ""}
    </div>
  </div>

  <div style="font-size:18px;font-weight:600;margin-bottom:20px;">${escapeHtml(data.title)}</div>

  <div class="customer-info">
    ${data.company ? `
    <div class="info-block">
      <div class="section-title">Customer</div>
      <p style="font-weight:600;">${escapeHtml(data.company.name)}</p>
      ${data.company.addressLine1 ? `<p>${escapeHtml(data.company.addressLine1)}</p>` : ""}
      ${data.company.city ? `<p>${escapeHtml(data.company.city)} ${escapeHtml(data.company.postcode ?? "")}</p>` : ""}
      ${data.company.phone ? `<p>${escapeHtml(data.company.phone)}</p>` : ""}
      ${data.company.email ? `<p>${escapeHtml(data.company.email)}</p>` : ""}
    </div>` : ""}
    ${data.contact ? `
    <div class="info-block">
      <div class="section-title">Attention</div>
      <p style="font-weight:600;">${escapeHtml(data.contact.firstName)} ${escapeHtml(data.contact.lastName)}</p>
      ${data.contact.email ? `<p>${escapeHtml(data.contact.email)}</p>` : ""}
      ${data.contact.phone ? `<p>${escapeHtml(data.contact.phone)}</p>` : ""}
    </div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;">#</th>
        <th>Description</th>
        <th style="text-align:center;width:60px;">Qty</th>
        <th style="text-align:right;width:100px;">Unit Price</th>
        <th style="text-align:right;width:100px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <table class="totals">
    <tr><td>Subtotal</td><td style="text-align:right;">$${data.subtotal.toFixed(2)}</td></tr>
    <tr><td>GST (${(data.taxRate * 100).toFixed(0)}%)</td><td style="text-align:right;">$${data.taxAmount.toFixed(2)}</td></tr>
    <tr class="grand-total"><td>Total (inc GST)</td><td style="text-align:right;">$${data.total.toFixed(2)}</td></tr>
  </table>

  ${data.notes ? `
  <div class="notes">
    <div class="section-title">Notes</div>
    <p>${escapeHtml(data.notes)}</p>
  </div>` : ""}

  ${data.termsConditions ? `
  <div class="notes" style="margin-top:16px;">
    <div class="section-title">Terms & Conditions</div>
    <p>${escapeHtml(data.termsConditions)}</p>
  </div>` : ""}

  <div class="footer">
    ${data.createdBy ? `<p>Prepared by: ${escapeHtml(data.createdBy)}</p>` : ""}
    <p>This quote is valid for 30 days from the date of issue unless otherwise stated.</p>
    <p>All prices are in New Zealand Dollars (NZD) and include GST where stated.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
