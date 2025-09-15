// apps/web/src/app/api/receipts/pdf-lib.ts
import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import path from 'path';

type ReceiptArgs = {
  id: string;
  name: string;
  phone: string;
  eventDate: string | null;
  amountTotal: number;
  advancePaid: number;
  finalPaidNow: number;
  remainingAmount: number;
};

// Cache font bytes across invocations (serverless-friendly)
let ROBOTO_REG_BYTES: Buffer | null = null;
let ROBOTO_BOLD_BYTES: Buffer | null = null;

async function loadFontBytes(fileName: string): Promise<Buffer> {
  const p = path.join(process.cwd(), 'public', 'fonts', fileName);
  return fs.readFile(p);
}

export async function createReceiptPdfBuffer(args: ReceiptArgs): Promise<Buffer> {
  const { id, name, phone, eventDate, amountTotal, advancePaid, finalPaidNow, remainingAmount } = args;

  const doc = new PDFDocument({ size: 'A4', margin: 48 });

  // Load font bytes only once
  if (!ROBOTO_REG_BYTES) {
    ROBOTO_REG_BYTES = await loadFontBytes('Roboto-Regular.ttf');
    console.log(`ROBOTO_REG_BYTES populated: ${!!ROBOTO_REG_BYTES}`);
  }
  if (!ROBOTO_BOLD_BYTES) {
    ROBOTO_BOLD_BYTES = await loadFontBytes('Roboto-Bold.ttf');
    console.log(`ROBOTO_BOLD_BYTES populated: ${!!ROBOTO_BOLD_BYTES}`);
  }

  // Register and use custom fonts with Identity-H encoding for Unicode support
  doc.registerFont('Roboto-Regular', ROBOTO_REG_BYTES);
  doc.registerFont('Roboto-Bold', ROBOTO_BOLD_BYTES);

  // Set default font
  doc.font('Roboto-Regular');

  // Border
  doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).strokeColor('#999').lineWidth(1).stroke();

  doc.fontSize(20).fillColor('#111').font('Roboto-Bold').text('Final Receipt', { align: 'center' }).moveDown(1);

  doc.fontSize(12).fillColor('#333').font('Roboto-Regular');
  doc.text(`Receipt #: ${id}`);
  doc.text(`Name    : ${name}`);
  doc.text(`Phone   : ${phone}`);
  doc.text(`Event   : ${eventDate ?? '-'}`);
  doc.moveDown(0.5);

  doc.text(`Total Amount   : ₹${Number(amountTotal || 0)}`);
  doc.text(`Advance Paid   : ₹${Number(advancePaid || 0)}`);
  doc.text(`Paid Now       : ₹${Number(finalPaidNow || 0)}`);
  doc.text(`Remaining      : ₹${Number(remainingAmount || 0)}`);
  doc.moveDown(1);

  doc.fontSize(9).fillColor('#666').font('Roboto-Regular').text('Thank you for choosing us!', { align: 'center' });

  doc.end();

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', (err) => reject(err));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
