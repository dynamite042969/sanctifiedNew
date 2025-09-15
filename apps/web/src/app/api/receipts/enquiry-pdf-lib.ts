// apps/web/src/app/api/receipts/enquiry-pdf-lib.ts
import chromium from '@sparticuz/chromium';
import puppeteer, { LaunchOptions } from 'puppeteer-core';
import fs from 'fs/promises';

// Define the structure of the event details
interface EnquiryEvent {
  name: string;
  date: string;
}

// Define the arguments for the PDF creation function
interface EnquiryPdfArgs {
  customerName: string;
  events: EnquiryEvent[];
  advancePayment: number;
  remainingPayment: number;
  totalAmount: number;
}

export async function createEnquiryPdfBuffer(args: EnquiryPdfArgs): Promise<Buffer> {
  const { customerName, events, advancePayment, remainingPayment, totalAmount } = args;

  // Construct the event details HTML
  const eventsHtml = events
    .map((event) => `<p><strong>Event:</strong> ${event.name} | <strong>Date:</strong> ${event.date}</p>`)
    .join('');

  // Construct the full HTML content for the PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Enquiry Receipt</title>
        <style>
            body {
                font-family: 'Roboto', sans-serif;
                margin: 24px;
                color: #333;
            }
            .container {
                border: 1px solid #ccc;
                padding: 24px;
            }
            h1 { text-align: center; color: #111; }
            p { margin: 8px 0; font-size: 14px; }
            .details { margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    </head>
    <body>
        <div class="container">
            <h1>Sanctified Studios - Enquiry Confirmation</h1>
            <p><strong>Customer:</strong> ${customerName}</p>
            <div class="details">
                <h2>Event Details</h2>
                ${eventsHtml}
            </div>
            <div class="details">
                <h2>Payment Summary</h2>
                <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
                <p><strong>Advance Paid:</strong> ₹${advancePayment}</p>
                <p><strong>Remaining Payment:</strong> ₹${remainingPayment}</p>
            </div>
            <div class="footer">
                <p>Thank you for choosing Sanctified Studios!</p>
                <p>Gorakhpur | 9827411116</p>
            </div>
        </div>
    </body>
    </html>
  `;

  let browser = null;
  try {
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
          executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          headless: false,
        };
      }
    };

    const launchOptions = await getLaunchOptions();
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'a4', printBackground: true });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
