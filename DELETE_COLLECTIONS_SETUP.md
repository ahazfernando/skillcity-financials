# Delete Collections Setup Guide

This guide explains how to delete all collections except the `users` collection from your Firestore database.

## Option 1: Using the Web Interface (Recommended)

1. **Install firebase-admin:**
   ```bash
   npm install firebase-admin
   ```

2. **Set up Firebase Admin SDK credentials:**

   You have two options:

   **Option A: Service Account Key (Recommended for local development)**
   
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project (`skillcity-finflow`)
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file
   - Add the entire JSON content to your `.env.local` file as:
     ```
     FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...",...}'
     ```
     (Make sure to escape quotes properly or use single quotes)

   **Option B: Application Default Credentials (For production)**
   
   - Install Google Cloud SDK
   - Run: `gcloud auth application-default login`
   - Set: `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json`

3. **Start your development server:**
   ```bash
   npm run dev
   ```

4. **Navigate to the delete page:**
   ```
   http://localhost:3000/delete-collections
   ```

5. **Click the delete button** (you'll be asked to confirm twice)

## Option 2: Using the API Route Directly

1. Follow steps 1-2 from Option 1 to install and configure firebase-admin

2. **Make a POST request to the API:**
   ```bash
   curl -X POST http://localhost:3000/api/delete-all-collections
   ```

   Or use any HTTP client like Postman, Insomnia, etc.

## Option 3: Using the Script (Requires Admin SDK)

1. Follow steps 1-2 from Option 1 to install and configure firebase-admin

2. **Run the script:**
   ```bash
   npm run delete-collections
   ```

## Troubleshooting

### Error: "Firebase Admin SDK not properly configured"

- Make sure `firebase-admin` is installed: `npm install firebase-admin`
- Verify your service account key is correctly set in `.env.local`
- Check that `NEXT_PUBLIC_FIREBASE_PROJECT_ID` matches your Firebase project ID

### Error: "Permission denied"

- Make sure your service account has the "Cloud Datastore User" role
- In Firebase Console → IAM & Admin → Service Accounts, verify permissions

### Collections not being deleted

- Check the browser console or server logs for specific error messages
- Verify the collection names match exactly (case-sensitive)
- Ensure you have admin permissions in Firestore

## What Gets Deleted

All documents from these collections will be deleted:
- employees, workRecords, workHours, employeeTimesheets
- employeePayRates, bankDetails, leaveRequests
- invoices, payroll, expenses
- sites, clients, siteEmployeeAllocations
- reminders, groups, chatGroups, messages
- activityLogs, tasks, cleaningTracker
- products, categories, employeeLocations

**The `users` collection will be preserved.**

## Important Notes

⚠️ **This action is irreversible!** Make sure you have a backup if needed.

The deletion process:
- Processes collections one by one
- Deletes documents in batches of 500 (Firestore limit)
- Shows progress and a summary when complete
- Continues even if some collections fail (reports errors)
