import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { generateQuoteHtml } from "@/lib/pdf/quote-pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await db.quote.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        company: true,
        contact: true,
        createdBy: { select: { name: true } },
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    });

    const html = generateQuoteHtml({
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      status: quote.status,
      validUntil: quote.validUntil
        ? new Intl.DateTimeFormat("en-NZ", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(quote.validUntil)
        : undefined,
      notes: quote.notes ?? undefined,
      termsConditions: quote.termsConditions ?? undefined,
      company: quote.company
        ? {
            name: quote.company.name,
            addressLine1: quote.company.addressLine1 ?? undefined,
            city: quote.company.city ?? undefined,
            postcode: quote.company.postcode ?? undefined,
            phone: quote.company.phone ?? undefined,
            email: quote.company.email ?? undefined,
          }
        : undefined,
      contact: quote.contact
        ? {
            firstName: quote.contact.firstName,
            lastName: quote.contact.lastName,
            email: quote.contact.email ?? undefined,
            phone: quote.contact.phone ?? undefined,
          }
        : undefined,
      lineItems: quote.lineItems.map((li) => ({
        description: li.description,
        productType: li.productType,
        dimensions: li.dimensions ?? undefined,
        finishType: li.finishType ?? undefined,
        quantity: li.quantity,
        unitPrice: Number(li.unitPrice),
        lineTotal: Number(li.lineTotal),
      })),
      subtotal: Number(quote.subtotal),
      taxRate: Number(quote.taxRate),
      taxAmount: Number(quote.taxAmount),
      total: Number(quote.total),
      createdBy: quote.createdBy?.name,
    });

    // Return HTML for preview — in production, this would pipe through
    // a headless browser (Puppeteer/Playwright) or a PDF library for
    // actual PDF generation. The HTML is print-optimized.
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
}
