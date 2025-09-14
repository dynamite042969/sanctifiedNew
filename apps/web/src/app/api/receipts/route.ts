// apps/web/src/app/api/receipts/route.ts
export const runtime = 'nodejs';          // ensure Node runtime (not Edge)
export const dynamic = 'force-dynamic';   // don't cache build output

import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import supabase from '@/lib/supabaseClient'; // server-side client

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('bookingId');
  const finalPaid = Number(searchParams.get('final') || 0);

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId missing' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Not found' },
      { status: 404 }
    );
  }

  const {
    id,
    name,
    phone,
    amount_total,
    advance_paid,
    remaining_amount,
    event_date,
  } = data as any;

  // ---- build PDF with PDFKit (Node) ----
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c as Buffer));
  const done: Promise<Buffer> = new Promise((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  );

  // border
  doc.rect(15, 15, doc.page.width - 30, doc.page.height - 30).lineWidth(2).stroke('#444');

  // header
  doc.fontSize(22).fillColor('#111').text('Final Receipt', { align: 'center' }).moveDown(0.5);
  doc.fontSize(10).fillColor('#555').text(`Receipt ID: ${id}`, { align: 'center' }).moveDown(1.2);

  // body
  const left = 60;
  doc.fillColor('#000').fontSize(12);
  doc.text(`Customer: ${name}`, left).moveDown(0.3);
  doc.text(`Phone: ${phone}`, left).moveDown(0.3);
  doc.text(`Event Date: ${dayjs(event_date).format('DD MMM YYYY')}`, left).moveDown(1);

  const tblTop = doc.y;
  const rows = [
    ['Total Amount', `₹ ${amount_total}`],
    ['Advance Paid (before final)', `₹ ${advance_paid}`],
    ['Final Payment (this receipt)', `₹ ${finalPaid}`],
    ['Advance Paid (after final)', `₹ ${Number(advance_paid) + Number(finalPaid)}`],
    [
      'Remaining Amount',
      `₹ ${Math.max(0, Number(amount_total) - (Number(advance_paid) + Number(finalPaid)))}`,
    ],
  ];

  const col1 = left,
    col2 = 350,
    rowH = 26,
    w = doc.page.width - left * 2;
  doc.roundedRect(left - 10, tblTop - 8, w, rowH * rows.length + 16, 6).stroke('#ccc');
  rows.forEach((r, i) => {
    const y = tblTop + i * rowH;
    doc.fillColor('#333').fontSize(12).text(r[0], col1, y);
    doc.fillColor('#111').font('Helvetica-Bold').text(r[1], col2, y, { align: 'left' });
    doc.font('Helvetica');
    if (i < rows.length - 1) {
      doc.moveTo(left - 10, y + rowH).lineTo(left - 10 + w, y + rowH).stroke('#eee');
    }
  });

  // footer
  doc.moveDown(2).fontSize(10).fillColor('#666')
    .text('Thank you for choosing Baby Studio • Wedding Studio • Events', { align: 'center' });

  doc.end();
  const pdf: Buffer = await done;

  const pdfUint8 = new Uint8Array(pdf);

  return new NextResponse(pdfUint8, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receipt-${id}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
