import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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
  const { id, name, phone, eventDate, amountTotal, advancePaid, finalPaidNow, remainingAmount } = args;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Border
  const margin = 24;
  page.drawRectangle({
    x: margin, y: margin, width: width - margin * 2, height: height - margin * 2,
    borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1
  });

  let y = height - 72;
  const draw = (text: string, f = font, size = 12, color = rgb(0,0,0)) => {
    page.drawText(text, { x: 48, y, size, font: f, color });
    y -= size + 8;
  };

  page.drawText('Final Receipt', { x: 48, y, size: 20, font: bold, color: rgb(0.1,0.1,0.1) });
  y -= 30;

  draw(`Receipt #: ${id}`, font, 12, rgb(0.2,0.2,0.2));
  draw(`Name    : ${name}`, font, 12, rgb(0.2,0.2,0.2));
  draw(`Phone   : ${phone}`, font, 12, rgb(0.2,0.2,0.2));
  draw(`Event   : ${eventDate ?? '-'}`, font, 12, rgb(0.2,0.2,0.2));
  y -= 8;

  draw(`Total Amount   : ₹${Number(amountTotal || 0)}`);
  draw(`Advance Paid   : ₹${Number(advancePaid || 0)}`);
  draw(`Paid Now       : ₹${Number(finalPaidNow || 0)}`);
  draw(`Remaining      : ₹${Number(remainingAmount || 0)}`);
  y -= 12;

  page.drawText('Thank you for choosing us!', {
    x: 48, y, size: 9, font, color: rgb(0.4,0.4,0.4)
  });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
