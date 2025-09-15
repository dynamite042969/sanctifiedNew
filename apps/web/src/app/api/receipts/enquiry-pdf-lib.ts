// apps/web/src/app/api/receipts/enquiry-pdf-lib.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import chromium from '@sparticuz/chromium';
import puppeteer, { LaunchOptions } from 'puppeteer-core';

// --- Types -------------------------------------------------------------------

interface EnquiryEvent {
  name: string;
  date: string; // display-ready (e.g., "12 Oct 2025"); pass what you prefer
}

interface EnquiryPdfArgs {
  /** Will be shown as "Invoice For" */
  customerName: string;

  /** e.g., "Wedding Gold", "Baby Premium" */
  packageType: string;

  /** Rows under the table as descriptive lines (no pricing on each event) */
  events: EnquiryEvent[];

  /** Single total shown (no GST breakdown) */
  totalAmount: number;

  /** Optional base64/URL data for logo (PNG/SVG/JPG). If omitted, shows text. */
  logoDataUrl?: string;

  /** Optional base64/URL data for a QR image to pay. If omitted, shows placeholder box. */
  qrDataUrl?: string;

  /** Optional explicit invoice id. If omitted, uses a timestamp-based id. */
  id?: string;
}

// --- Helpers -----------------------------------------------------------------

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );

const todayLabel = () =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());

const esc = (s: string) =>
  (s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!));

// --- Core --------------------------------------------------------------------

export async function createEnquiryPdfBuffer(args: EnquiryPdfArgs): Promise<Buffer> {
  const {
    customerName,
    packageType,
    events,
    totalAmount,
    logoDataUrl,
    qrDataUrl,
    id = `INV-${Date.now()}`,
  } = args;

  const eventsRowsHtml =
    events?.length
      ? events
          .map(
            (e) => `
        <tr class="tbl-row muted">
          <td>• ${esc(e.name)} — ${esc(e.date)}</td>
          <td class="num">—</td>
          <td class="num">—</td>
        </tr>`
          )
          .join('')
      : '';

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <title>Sanctified Studios — Invoice</title>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        html, body { margin:0; padding:0; }
        body {
          font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif;
          color:#222; -webkit-print-color-adjust: exact; print-color-adjust: exact;
          padding: 28px 40px;
          background: #fff;
        }
        .wrapper {
          border: 1px solid #e6e6e6; border-radius: 12px; padding: 28px; position: relative;
          box-shadow: 0 1px 1px rgba(0,0,0,0.02);
        }

        /* Header */
        .header {
          display: grid; grid-template-columns: 120px 1fr; gap: 16px; align-items: center; margin-bottom: 8px;
        }
        .logoBox {
          width: 120px; height: 120px; border-radius: 12px; display:flex; align-items:center; justify-content:center;
          background: linear-gradient(135deg,#fff7e6,#fff); border:1px solid #f0e6cc; overflow:hidden;
        }
        .logoBox img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .brand h1 {
          font-family: 'Playfair Display', serif; font-size: 28px; letter-spacing: 0.4px; margin: 0; color:#6b4e2e;
        }
        .brand .sub { font-size: 12px; color:#7a7a7a; margin-top: 4px; }

        /* Meta bar */
        .meta {
          display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; margin: 18px 0 8px;
        }
        .meta .box {
          border:1px solid #eee; border-radius:10px; padding:12px 14px; background:#fafafa;
        }
        .meta .label { font-size:11px; color:#888; text-transform: uppercase; letter-spacing: .6px; }
        .meta .value { font-weight:600; margin-top: 2px; }

        /* Bill to */
        .billto {
          margin: 10px 0 18px;
          display:flex; align-items:center; gap:16px;
        }
        .billto .title { font-size:12px; color:#777; }
        .billto .name { font-size:16px; font-weight:700; }

        /* Table */
        table { width:100%; border-collapse: collapse; }
        thead th {
          text-align:left; font-size:12px; letter-spacing:.5px; text-transform:uppercase; color:#666;
          border-bottom:1px solid #e9e9e9; padding:10px 8px;
        }
        td { padding:10px 8px; font-size:14px; vertical-align: top; }
        .num { text-align:right; }
        .tbl-row { border-bottom:1px solid #f1f1f1; }
        .muted { color:#666; }

        /* Totals */
        .totals {
          display:flex; justify-content:flex-end; margin-top: 8px;
        }
        .totals .box {
          min-width: 260px; border:1px solid #eee; border-radius: 10px; padding: 12px 14px; background:#fffdfa;
        }
        .totals .row { display:flex; justify-content: space-between; margin: 4px 0; }
        .totals .grand { font-weight: 800; font-size: 16px; border-top:1px dashed #e8e0cf; padding-top:8px; margin-top:6px; }

        /* Pay box */
        .pay {
          margin-top: 16px; display:grid; grid-template-columns: 1fr 220px; gap: 16px;
          align-items: center;
        }
        .pay .qr {
          width:220px; height:220px; border:1px dashed #e0cfa8; border-radius: 12px; display:flex; align-items:center; justify-content:center;
          background: #fff9ee;
        }
        .pay .qr img { max-width: 92%; max-height: 92%; }
        .pay .text p { margin:4px 0; color:#555; }

        /* Footer */
        .footer {
          margin-top: 24px; text-align:center; color:#5a5a5a;
        }
        .footer strong { color:#6b4e2e; }
        .signoff { margin-top: 16px; text-align: right; }
        .terms {
          margin-top: 16px; font-size: 11px; color:#777; line-height: 1.4; border-top:1px solid #eee; padding-top: 12px;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <!-- Header -->
        <div class="header">
          <div class="logoBox">
            ${
              logoDataUrl
                ? `<img src="${esc(logoDataUrl)}" alt="Sanctified Studios Logo"/>`
                : `<div style="font-weight:800;color:#b4935c;font-family:'Playfair Display',serif;">Sanctified</div>`
            }
          </div>
          <div class="brand">
            <h1>Sanctified Studios</h1>
            <div class="sub">Creative • Photography • Films</div>
          </div>
        </div>

        <!-- Meta -->
        <div class="meta">
          <div class="box">
            <div class="label">Invoice Number</div>
            <div class="value">${esc(id)}</div>
          </div>
          <div class="box">
            <div class="label">Date</div>
            <div class="value">${todayLabel()}</div>
          </div>
          <div class="box">
            <div class="label">Reference</div>
            <div class="value">—</div>
          </div>
        </div>

        <!-- Bill To -->
        <div class="billto">
          <div class="title">Invoice For</div>
          <div class="name">${esc(customerName)}</div>
        </div>

        <!-- Items -->
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="num">Price</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr class="tbl-row">
              <td><strong>Package:</strong> ${esc(packageType)}</td>
              <td class="num">${formatINR(totalAmount)}</td>
              <td class="num">${formatINR(totalAmount)}</td>
            </tr>
            ${eventsRowsHtml}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
          <div class="box">
            <div class="row grand"><div>Total Amount</div><div>${formatINR(totalAmount)}</div></div>
          </div>
        </div>

        <!-- Pay / QR -->
        <div class="pay">
          <div class="text">
            <p><strong>Send Payments To</strong></p>
            <p>Scan the QR to pay (UPI/Bank QR). If you’ve been given a different method, please use that.</p>
          </div>
          <div class="qr">
            ${
              qrDataUrl
                ? `<img src="${esc(qrDataUrl)}" alt="Payment QR"/>`
                : `<span style="color:#b4935c;font-size:12px;">QR will appear here</span>`
            }
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Thanks for choosing <strong>us</strong>.</p>
          <p class="signoff">Regards,<br/><strong>Sanctified Studios</strong></p>
          <div class="terms">
            <strong>Terms & Conditions</strong><br/>
            • This is a system-generated invoice; no signature required.<br/>
            • Dates and deliverables are as discussed with the client; changes may affect pricing and timelines.<br/>
            • Payments are non-transferable once booking is confirmed unless agreed in writing.
          </div>
        </div>
      </div>
    </body>
  </html>`;

  // --- Launch Puppeteer (local dev vs serverless) ----------------------------
  const isProduction = process.env.NODE_ENV === 'production';

  const getLaunchOptions = async (): Promise<LaunchOptions> => {
    if (isProduction) {
      return {
        args: [...chromium.args, '--ignore-certificate-errors'],
        executablePath: await chromium.executablePath(),
        headless: 'shell',
      };
    } else {
      return {
        args: ['--ignore-certificate-errors'],
        executablePath: 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
        headless: false,
      };
    }
  };

  let browser = null as any;
  try {
    const launchOptions = await getLaunchOptions();
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'a4',
      printBackground: true,
      margin: { top: '16mm', right: '12mm', bottom: '18mm', left: '12mm' },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) await browser.close();
  }
}
