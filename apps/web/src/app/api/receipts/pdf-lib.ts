// apps/web/src/app/api/receipts/pdf-lib.ts
import chromium from '@sparticuz/chromium';
import puppeteer, { LaunchOptions } from 'puppeteer-core';
import path from 'path';
import fs from 'fs/promises';

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

  // Construct HTML content for the receipt
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Receipt</title>
        <style>
            body {
                font-family: 'Roboto', sans-serif;
                margin: 0;
                padding: 48px;
                color: #333;
            }
            .container {
                border: 1px solid #999;
                padding: 24px;
                min-height: 700px; /* Approximate A4 height */
                box-sizing: border-box;
            }
            h1 {
                text-align: center;
                color: #111;
                font-size: 24px;
                margin-bottom: 20px;
            }
            p {
                margin: 8px 0;
                font-size: 14px;
            }
            .amount-details p {
                font-size: 16px;
                font-weight: bold;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                font-size: 12px;
                color: #666;
            }
        </style>
        <!-- Link to Google Fonts for Roboto -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    </head>
    <body>
        <div class="container">
            <h1>Final Receipt</h1>
            <p><strong>Receipt #:</strong> ${id}</p>
            <p><strong>Name    :</strong> ${name}</p>
            <p><strong>Phone   :</strong> ${phone}</p>
            <p><strong>Event   :</strong> ${eventDate ?? '-'}</p>
            <br>
            <div class="amount-details">
                <p><strong>Total Amount   :</strong> ₹${Number(amountTotal || 0)}</p>
                <p><strong>Advance Paid   :</strong> ₹${Number(advancePaid || 0)}</p>
                <p><strong>Paid Now       :</strong> ₹${Number(finalPaidNow || 0)}</p>
                <p><strong>Remaining      :</strong> ₹${Number(remainingAmount || 0)}</p>
            </div>
            <div class="footer">
                <p>Thank you for choosing us!</p>
            </div>
        </div>
    </body>
    </html>
  `;

  let browser = null;
  try {
    // Check if running in a serverless environment (like Vercel) or locally
    const isProduction = process.env.NODE_ENV === 'production';

    const getLaunchOptions = async (): Promise<LaunchOptions> => {
      if (isProduction) {
        // Production (Vercel/serverless) environment uses @sparticuz/chromium
        return {
          args: [...chromium.args, '--ignore-certificate-errors'],
          defaultViewport: { width: 1920, height: 1080 },
          executablePath: await chromium.executablePath(),
          headless: 'shell',
        };
      } else {
        // Local development environment uses a local Chrome installation
        // You may need to adjust this path if your Chrome is installed elsewhere
        return {
          args: ['--ignore-certificate-errors'],
          executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          headless: false, // Set to true if you don't want to see the browser window
        };
      }
    };

    const launchOptions = await getLaunchOptions();
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'a4',
      printBackground: true, // Ensure background colors/images are printed
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
