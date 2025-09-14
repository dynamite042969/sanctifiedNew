import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createReceiptPdfBuffer } from '../../receipts/pdf-lib'; // keep your helper here

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { bookingId, finalAmount } = await req.json();

    if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      return NextResponse.json(
        { ok: false, error: 'WhatsApp API not configured (missing envs).' },
        { status: 500 }
      );
    }

    // Load booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { ok: false, error: error?.message || 'Booking not found' },
        { status: 404 }
      );
    }

    // Build PDF
    const pdfBuffer = await createReceiptPdfBuffer({
      id: booking.id,
      name: booking.name,
      phone: booking.phone,
      eventDate: booking.event_date,
      amountTotal: Number(booking.amount_total ?? 0),
      advancePaid: Number(booking.advance_paid ?? 0),
      finalPaidNow: Number(finalAmount ?? 0),
      remainingAmount: Number(booking.remaining_amount ?? 0),
    });

    // Upload media to WhatsApp
    const form = new FormData();
    form.set('messaging_product', 'whatsapp');
    form.set('type', 'application/pdf');
    form.set('file', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), `receipt-${booking.id}.pdf`);

    const mediaRes = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
        body: form,
      }
    );

    const mediaJson: any = await mediaRes.json();
    if (!mediaRes.ok) {
      console.error('WA media upload error:', mediaJson);
      return NextResponse.json({ ok: false, error: mediaJson.error?.message || 'Upload failed' }, { status: 500 });
    }

    // Send document to the customer
    const sendRes = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: `+${(booking.phone as string).replace(/\D/g, '')}`, // e.g. +919755...
          type: 'document',
          document: {
            id: mediaJson.id,
            caption: `Final receipt for ${booking.name}`,
            filename: `receipt-${booking.id}.pdf`,
          },
        }),
      }
    );

    const sendJson: any = await sendRes.json();
    if (!sendRes.ok) {
      console.error('WA send error:', sendJson);
      return NextResponse.json({ ok: false, error: sendJson.error?.message || 'Send failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('WA route error:', e);
    return NextResponse.json({ ok: false, error: e.message || 'Unknown error' }, { status: 500 });
  }
}
