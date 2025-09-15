// apps/web/src/app/api/receipts/pdf-lib.ts
import fs from 'fs/promises';
import path from 'path';
import * as fontkit from 'fontkit'; // Import fontkit

// Register fontkit with PDFDocument (do this once)
// This must be done *before* importing PDFDocument
// @ts-ignore
PDFLib.PDFDocument.registerFontkit(fontkit); // Use PDFLib.PDFDocument

import * as PDFLib from 'pdf-lib';
const { PDFDocument, rgb } = PDFLib;

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
let ROBOTO_REG_BYTES: Uint8Array | null = null;
let ROBOTO_BOLD_BYTES: Uint8Array | null = null;

async function loadFontBytes(fileName: string) {
  const p = path.join(process.cwd(), 'public', 'fonts', fileName);
  return new Uint8Array(await fs.readFile(p));
}

export async function createReceiptPdfBuffer(args: ReceiptArgs): Promise<Buffer> {
  const { id, name, phone, eventDate, amountTotal, advancePaid, finalPaidNow, remainingAmount } = args;

  if (!ROBOTO_REG_BYTES) ROBOTO_REG_BYTES = await loadFontBytes('Roboto-Regular.ttf');
  if (!ROBOTO_BOLD_BYTES) ROBOTO_BOLD_BYTES = await loadFontBytes('Roboto-Bold.ttf');

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const roboto = await pdf.embedFont(ROBOTO_REG_BYTES, { subset: true });
  const robotoBold = await pdf.embedFont(ROBOTO_BOLD_BYTES, { subset: true });

  // Border
  const margin = 24;
  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - margin * 2,
    height: height - margin * 2,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 1,
  });

  let y = height - 72;
  const draw = (
    text: string,
    font = roboto,
    size = 12,
    color = rgb(0, 0, 0),
    x = 48
  ) => {
    page.drawText(text, { x, y, size, font, color });
    y -= size + 8;
  };

  // Header
  page.drawText('Final Receipt', { x: 48, y, size: 20, font: robotoBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 30;

  const dim = rgb(0.2, 0.2, 0.2);
  draw(`Receipt #: ${id}`, roboto, 12, dim);
  draw(`Name    : ${name}`, roboto, 12, dim);
  draw(`Phone   : ${phone}`, roboto, 12, dim);
  draw(`Event   : ${eventDate ?? '-'}`, roboto, 12, dim);
  y -= 8;

  // Use ₹ safely because Roboto contains U+20B9
  draw(`Total Amount   : ₹${Number(amountTotal || 0)}`);
  draw(`Advance Paid   : ₹${Number(advancePaid || 0)}`);
  draw(`Paid Now       : ₹${Number(finalPaidNow || 0)}`);
  draw(`Remaining      : ₹${Number(remainingAmount || 0)}`);
  y -= 12;

  page.drawText('Thank you for choosing us!', {
    x: 48,
    y,
    size: 9,
    font: roboto,
    color: rgb(0.4, 0.4, 0.4),
  });

  const bytes = await pdf.save(); // Uint8Array
  return Buffer.from(bytes);
}