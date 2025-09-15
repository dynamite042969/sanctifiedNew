// src/app/api/whatsapp/send-enquiry/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createEnquiryPdfBuffer } from '../../receipts/enquiry-pdf-lib';
import dayjs from 'dayjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// Emojis to be used in the message
const EMOJI_CAMERA = "📷";
const EMOJI_POINTER = "👉";
const EMOJI_CALENDAR = "📅";
const EMOJI_CLOCK = "🕰️";

export async function POST(req: Request) {
  try {
    const { enquiry, advancePayment, remainingPayment, totalAmount } = (await req.json()) as {
      enquiry: any; // The full enquiry object
      advancePayment: number;
      remainingPayment: number;
      totalAmount: number;
    };

    if (!process.env.SUPABASE_STORAGE_BUCKET_NAME) {
      return NextResponse.json({ ok: false, error: 'Missing SUPABASE_STORAGE_BUCKET_NAME' }, { status: 500 });
    }

    const eventDate = dayjs(enquiry.date).format("DD-MMM-YYYY");
    let eventsForPdf: { name: string; date: string; }[] = [];
    let whatsappMessage = '';

    // Determine events for PDF based on package
    if (enquiry.package === 'premium' || enquiry.package === 'regular') {
        eventsForPdf = [
            { name: "MEHENDI", date: eventDate },
            { name: "HALDI", date: eventDate },
            { name: "SANGEET", date: eventDate },
            { name: "WEDDING DAY", date: eventDate },
        ];
    } else if (enquiry.package === 'custom' && enquiry.custom_events) {
        eventsForPdf = enquiry.custom_events.map((event: any) => ({
            name: event.function,
            date: dayjs(event.date).format("DD-MMM-YYYY"),
        }));
    }

    // 1) Build PDF
    const pdfBuffer = await createEnquiryPdfBuffer({
      customerName: enquiry.name,
      packageType: enquiry.package,
      events: eventsForPdf,
      totalAmount: totalAmount,
    });

    // 2) Upload to Supabase Storage
    const fileName = `enquiry-receipt-${enquiry.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET_NAME)
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if file exists
      });

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
    }

    // 3) Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET_NAME)
      .getPublicUrl(fileName);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return NextResponse.json({ ok: false, error: 'Failed to get public URL' }, { status: 500 });
    }
    const supabaseStorageLink = publicUrlData.publicUrl;

    // 4) Construct WhatsApp message based on package
    if (enquiry.package === 'premium') {
        const eventsText = eventsForPdf
            .map(event => `${EMOJI_POINTER} Event :- ${event.name}
${EMOJI_CALENDAR} Date :- ${event.date}`)
            .join('\n\n');

        whatsappMessage = `
${EMOJI_CAMERA} Hi, ${enquiry.name} you are successfully enquired ORDER with Sanctified Studios for following event's

-----------------------------------------------
${eventsText}
-----------------------------------------------

Advance payment received : ₹${advancePayment}
Pending Payment ₹${remainingPayment}
total Amount - ${totalAmount}

Here is your receipt - ${supabaseStorageLink}

Thanks for trusting Sanctified Studio to be a part of your celebration.
Regards, Sanctified Studios Gorakhpur 9827411116
        `;
    } else if (enquiry.package === 'custom') {
        const eventsText = enquiry.custom_events
            .map((event: any) => {
                const dateStr = dayjs(event.date).format("DD-MMM-YYYY");
                const timeStr = dayjs(event.time).format("hh:mm A");
                return `-----------------------------------------------
${EMOJI_POINTER} Event :- ${event.function}
${EMOJI_CALENDAR} Date :- ${dateStr}
${EMOJI_CLOCK} Time :- ${timeStr}
-----------------------------------------------`;
            })
            .join('\n');

        whatsappMessage = `
${EMOJI_CAMERA} Hi, ${enquiry.name} you are successfully enquired ORDER with us for following event's
package type - ${enquiry.package}

${eventsText}

Advance payment received : ₹${advancePayment}
Pending Payment ₹${remainingPayment}
total Amount - ${totalAmount}

Here is your receipt - ${supabaseStorageLink}

Thanks for trusting Sanctified Studio to be a part of your celebration.
Regards, Sanctified Studios Gorakhpur 9827411116
        `;
    } else {
        // Default message for regular package
        const eventsText = eventsForPdf
            .map(event => `${EMOJI_POINTER} Event :- ${event.name} ${EMOJI_CALENDAR} Date :- ${event.date}`)
            .join('\n');

        whatsappMessage = `
${EMOJI_CAMERA} Hi, you are successfully enquired with Sanctified Studios for following event's

${eventsText}

Advance payment received : ₹${advancePayment}
Pending Payment ₹${remainingPayment}
total Amount - ${totalAmount}

Here is your receipt - ${supabaseStorageLink}

Thanks for trusting Sanctified Studio to be a part of your celebration.
Regards, Sanctified Studios Gorakhpur 9827411116
        `;
    }

    const encodedMessage = encodeURIComponent(whatsappMessage.trim());
    const whatsappUrl = `https://wa.me/${enquiry.phone}?text=${encodedMessage}`;

    return NextResponse.json({ ok: true, whatsappUrl });
  } catch (e: any) {
    console.error('API route error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
