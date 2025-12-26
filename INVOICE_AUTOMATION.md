# Invoice and Payroll Automation

This document describes the automatic invoice status updates and payroll record creation system.

## Overview

The system automatically:
1. **Updates invoice statuses** based on dates:
   - Invoices become "pending" on the 1st of the month after they were created
   - Invoices become "overdue" from the 15th of that month onwards
   
2. **Creates payroll records** automatically when invoices become pending or overdue

3. **Synchronizes** invoice and payroll data

## How It Works

### Status Calculation Rules

- **Example**: An invoice filled in November becomes "pending" on December 1st
- The same invoice becomes "overdue" from December 15th onwards

### Automatic Processing

The automation is triggered in two ways:

1. **On Invoice Creation/Update**: When an invoice is created or updated, the system automatically:
   - Calculates the correct status based on the issue date
   - Updates the invoice status if needed
   - Creates a payroll record if the status is "pending" or "overdue" and no payroll record exists

2. **Bulk Processing**: You can process all invoices at once via the API endpoint

## API Endpoints

### Process All Invoices
```
GET /api/process-invoices
```
Processes all invoices in the database and updates their statuses, creating payroll records as needed.

**Response:**
```json
{
  "success": true,
  "invoicesProcessed": 10,
  "statusesUpdated": 5,
  "payrollsCreated": 3,
  "errors": [],
  "message": "Processed 10 invoices. Updated 5 statuses, created 3 payroll records."
}
```

### Process Single Invoice
```
POST /api/process-invoices
Content-Type: application/json

{
  "invoiceId": "invoice-id-here"
}
```

Processes a single invoice.

**Response:**
```json
{
  "success": true,
  "statusUpdated": true,
  "payrollCreated": true,
  "payrollId": "payroll-id-here",
  "message": "Invoice processed and payroll record created"
}
```

## Employee Invoice Creation

Employees can now create invoices. The system will:
1. Allow the employee to create the invoice
2. Automatically process it to determine status
3. Create payroll records when appropriate
4. Admins can view all invoices

## Firestore Security Rules

The Firestore rules have been updated to allow:
- **Employees**: Can create invoices
- **Admins**: Can read, update, and delete all invoices

## Manual Trigger

You can manually trigger the automation by:

1. **Via API**: Call `GET /api/process-invoices` or `POST /api/process-invoices`
2. **Via Code**: Import and call `processAllInvoices()` or `processSingleInvoice(invoiceId)`

## Scheduled Processing (Optional)

To run this automatically on a schedule, you can:

1. **Use Vercel Cron Jobs** (if deployed on Vercel):
   Add to `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/process-invoices",
       "schedule": "0 0 * * *"
     }]
   }
   ```
   This runs daily at midnight.

2. **Use a third-party cron service** like:
   - EasyCron
   - Cron-job.org
   - GitHub Actions (scheduled workflows)

3. **Use Firebase Cloud Functions** (if using Firebase):
   Create a scheduled function that calls the API endpoint

## Testing

To test the automation:

1. Create an invoice with an issue date in the previous month
2. The system should automatically:
   - Update the status to "pending" or "overdue" based on the current date
   - Create a payroll record if appropriate

3. Check the payroll list to see the automatically created record

## Troubleshooting

### Invoices not updating status
- Check that the issue date is in the correct format (ISO or DD.MM.YYYY)
- Manually trigger processing via the API endpoint
- Check browser console for errors

### Payroll records not being created
- Ensure the invoice status is "pending" or "overdue"
- Check that no duplicate payroll record already exists
- Verify the invoice has all required fields (name, amount, etc.)

### Permission errors
- Ensure Firestore security rules are updated (see `firestore.rules`)
- Verify the user is authenticated and approved
- Check that employees have permission to create invoices

## Files

- `src/lib/invoice-payroll-automation.ts` - Core automation logic
- `src/app/api/process-invoices/route.ts` - API endpoint
- `src/lib/firebase/invoices.ts` - Updated to trigger automation
- `firestore.rules` - Updated security rules











