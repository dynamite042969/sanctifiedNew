// src/app/api/whatsapp/send/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createReceiptPdfBuffer } from '../../receipts/pdf-lib';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { bookingId, finalAmount, bookingType } = (await req.json()) as {
      bookingId: string; // Can be number (for wedding) or UUID (for baby)
      finalAmount: number;
      bookingType: 'wedding' | 'baby'; // New parameter
    };

    if (!process.env.SUPABASE_STORAGE_BUCKET_NAME) {
      return NextResponse.json({ ok: false, error: 'Missing SUPABASE_STORAGE_BUCKET_NAME' }, { status: 500 });
    }

    let booking: any;
    let bookingErr: any;

    if (bookingType === 'wedding') {
      const { data, error } = await supabase
        .from('wedding_active')
        .select('*')
        .eq('id', Number(bookingId)) // Cast to Number for bigint ID
        .single();
      booking = data;
      bookingErr = error;
    } else if (bookingType === 'baby') {
      // Assuming 'bookings' table for baby studio uses UUIDs
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId) // bookingId is already string/UUID
        .single();
      booking = data;
      bookingErr = error;
    } else {
      return NextResponse.json({ ok: false, error: 'Invalid bookingType' }, { status: 400 });
    }

    if (bookingErr || !booking) {
      return NextResponse.json(
        { ok: false, error: bookingErr?.message || 'Booking not found' },
        { status: 404 }
      );
    }

    // 2) Build PDF
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

    // 3) Upload to Supabase Storage
    const fileName = `receipt-${booking.id}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET_NAME)
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if file with same name exists
      });

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      return NextResponse.json({ ok: false, error: uploadError.message || 'Supabase Storage upload failed.' }, { status: 500 });
    }

    // 4) Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET_NAME)
      .getPublicUrl(fileName);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return NextResponse.json({ ok: false, error: 'Failed to get public URL for Supabase Storage file.' }, { status: 500 });
    }

    const supabaseStorageLink = publicUrlData.publicUrl;
    console.log('Supabase Storage Link:', supabaseStorageLink);

    // 5) Construct WhatsApp message and URL
    const whatsappMessage = `Hello ${booking.name},

Here is your receipt: ${supabaseStorageLink}

Thank you!`;
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/${booking.phone}?text=${encodedMessage}`;

    return NextResponse.json({ ok: true, whatsappUrl });
  } catch (e: any) {
    console.error('API route error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
