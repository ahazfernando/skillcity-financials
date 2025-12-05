# Technical Features Documentation

## Salary Calculator
Implemented employee salary calculation based on work hours per site using hourly rates and travel allowances. Calculates subtotals per site and total salary with PDF export functionality.

## Payment Cycle Automation
Automated payment date calculation using 45-day cycle from work date. Integrated reminder system syncs with payroll records and generates notifications for pending invoices at cycle end.

## Real-Time Chat System
Built real-time messaging using Firestore onSnapshot listeners for instant updates. Supports group creation, file/image uploads to Firebase Storage, and profit update sharing with mistake reporting.

## Profit Calculation Engine
Calculates profit from received invoices (revenue) minus received payroll outflows (expenses). Monthly profit summaries aggregate data by month showing revenue, expenses, and net profit breakdowns.

## Invoice History Management
Automatically moves paid invoices to history daily using localStorage tracking. Displays historical data with monthly profit summaries, date range filtering, and downloadable PDF reports.

## Dashboard Financial Overview
Real-time dashboard fetches invoices and payroll data from Firebase. Calculates total revenue, expenses, and profit with monthly cash flow charts and invoice status visualization.

## Payroll Partial Fill Support
Enabled partial form submission allowing payroll entries with minimal data. Defaults missing fields (date uses today, name defaults to "Unnamed") and calculates status automatically.

## Chat Profit Updates
One-click profit update sharing in chat groups. Calculates today's revenue and expenses from Firebase data, formats as structured message with breakdowns displayed as formatted cards.

## Mistake Reporting System
Integrated mistake reporting in chat with type classification (calculation error, data entry, missing data, duplicate). Includes severity levels and affected amount tracking for discrepancies.

## Monthly Report Generation
PDF report generation using jsPDF with company logo. Includes filtered payroll data, date range labels, formatted tables, and automatic download functionality for record keeping.

## Currency Formatting (AUD)
Standardized AUD currency formatting using Intl.NumberFormat with en-AU locale. Applied across dashboard, invoice history, and chat profit updates for consistent dollar display.

## Group Avatar Management
Default group avatars use company logo from public folder. Supports custom avatar URLs with fallback to SkillCityQ logo, displayed in group list and chat headers.

## Firestore Query Optimization
Removed composite index requirements by sorting in-memory after fetching. Groups and messages queries use array-contains filters without orderBy, eliminating index dependencies.

## Invoice Status Automation
Automatic status calculation based on payment cycle and current date. Determines pending, received, overdue, or late status using work date plus payment cycle days.

## Real-Time Data Synchronization
Firestore onSnapshot listeners provide instant updates for payroll, invoices, and chat messages. Changes reflect immediately across all connected clients without refresh.

## File Upload System
Multi-file upload support for chat messages with Firebase Storage integration. Handles images and documents with size validation, generates download URLs, displays previews.

