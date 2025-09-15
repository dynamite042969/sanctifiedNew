export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { createClient } from '@supabase/supabase-js';
import { createReceiptPdfBuffer } from './pdf-lib';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

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
    return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 });
  }

  const pdf = await createReceiptPdfBuffer({
    id: data.id,
    name: data.name,
    phone: data.phone,
    eventDate: data.event_date,
    amountTotal: Number(data.amount_total || 0),
    advancePaid: Number(data.advance_paid || 0),
    finalPaidNow: finalPaid,
    remainingAmount: Math.max(0, Number(data.amount_total || 0) - (Number(data.advance_paid || 0) + finalPaid)),
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receipt-${data.id}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
