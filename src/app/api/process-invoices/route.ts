import { NextRequest, NextResponse } from "next/server";
import { processAllInvoices, processSingleInvoice } from "@/lib/invoice-payroll-automation";

/**
 * API Route to process invoices and create payroll records
 * 
 * GET /api/process-invoices - Process all invoices
 * POST /api/process-invoices - Process a single invoice (body: { invoiceId: string })
 */
export async function GET(request: NextRequest) {
  try {
    const result = await processAllInvoices();
    
    return NextResponse.json({
      success: true,
      ...result,
      message: `Processed ${result.invoicesProcessed} invoices. Updated ${result.statusesUpdated} statuses, created ${result.payrollsCreated} payroll records.`,
    });
  } catch (error: any) {
    console.error("Error processing invoices:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process invoices",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId } = body;
    
    if (!invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "invoiceId is required",
        },
        { status: 400 }
      );
    }
    
    const result = await processSingleInvoice(invoiceId);
    
    return NextResponse.json({
      success: true,
      ...result,
      message: result.payrollCreated
        ? "Invoice processed and payroll record created"
        : result.statusUpdated
        ? "Invoice status updated"
        : "Invoice processed (no changes needed)",
    });
  } catch (error: any) {
    console.error("Error processing invoice:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process invoice",
      },
      { status: 500 }
    );
  }
}



