import { NextRequest, NextResponse } from "next/server";
import { processEmployeeTimesheet, processTimesheetOnStatusChange, processAllPendingTimesheets } from "@/lib/timesheet-invoice-automation";

/**
 * POST /api/process-timesheets
 * Process timesheet records and create invoices/payroll
 * 
 * Body options:
 * 1. { employeeId, employeeName, recordDate } - Process single employee timesheet
 * 2. { employeeId, employeeName, year, month } - Process specific month for employee
 * 3. { year, month } - Process all pending timesheets for a month
 * 4. {} - Process current month for all employees
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Option 1: Process single record status change
    if (body.employeeId && body.employeeName && body.recordDate) {
      await processTimesheetOnStatusChange(
        body.employeeId,
        body.employeeName,
        body.recordDate
      );
      
      return NextResponse.json({
        success: true,
        message: "Timesheet processed successfully",
      });
    }
    
    // Option 2: Process specific employee and month
    if (body.employeeId && body.employeeName && body.year && body.month) {
      const result = await processEmployeeTimesheet(
        body.employeeId,
        body.employeeName,
        body.year,
        body.month
      );
      
      return NextResponse.json({
        success: true,
        ...result,
        message: result.invoiceCreated 
          ? "Invoice and payroll created successfully"
          : result.error || "No action taken",
      });
    }
    
    // Option 3: Process all pending timesheets for a month
    const now = new Date();
    const year = body.year || now.getFullYear();
    const month = body.month || now.getMonth() + 1;
    
    const result = await processAllPendingTimesheets(year, month);
    
    return NextResponse.json({
      success: true,
      ...result,
      message: `Processed ${result.processed} employees. Created ${result.invoicesCreated} invoices and ${result.payrollsCreated} payroll records.`,
    });
  } catch (error: any) {
    console.error("Error processing timesheets:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process timesheets",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/process-timesheets
 * Process all pending timesheets for current month
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : new Date().getMonth() + 1;
    
    const result = await processAllPendingTimesheets(year, month);
    
    return NextResponse.json({
      success: true,
      ...result,
      message: `Processed ${result.processed} employees. Created ${result.invoicesCreated} invoices and ${result.payrollsCreated} payroll records.`,
    });
  } catch (error: any) {
    console.error("Error processing timesheets:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process timesheets",
      },
      { status: 500 }
    );
  }
}






