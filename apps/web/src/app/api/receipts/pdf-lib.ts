import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

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

export async function createReceiptPdfBuffer(args: ReceiptArgs): Promise<Buffer> {
  const {
    id, name, phone, eventDate,
    amountTotal, advancePaid, finalPaidNow, remainingAmount
  } = args;

  const doc = new PDFDocument({ size: 'A4', margin: 48 });

  // Register a custom font
  const fontPath = path.resolve(process.cwd(), 'apps/web/src/app/api/receipts/fonts/Roboto-Regular.ttf');
  doc.registerFont('Roboto', fontPath);
  doc.font('Roboto'); // Set the font for the document

  // Border
  doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).strokeColor('#999').lineWidth(1).stroke();

  doc.fontSize(20).fillColor('#111').text('Final Receipt', { align: 'center' }).moveDown(1);

  doc.fontSize(12).fillColor('#333');
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

  doc.fontSize(9).fillColor('#666').text('Thank you for choosing us!', { align: 'center' });

  doc.end();

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', (err) => reject(err));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
