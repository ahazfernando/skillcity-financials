# Firebase Setup Guide

## Project Name: FinFlow Central

**FinFlow Central** is a comprehensive financial management system for Skill City, providing end-to-end financial operations including invoice management, payroll processing, employee management, site tracking, work schedules, and reminders.

This project uses Firebase Firestore for storing invoice data and Firebase Storage for receipt files.

## Prerequisites

1. A Firebase account (sign up at https://firebase.google.com/)
2. A Firebase project created in the Firebase Console

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Enter a project name (e.g., `skillcity-finflow`)
4. Follow the setup wizard
5. Note: Your project ID will be auto-generated based on your project name (e.g., `skillcity-finflow`)

### 2. Enable Firestore Database

1. In your Firebase project, go to **Build** > **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development) or **Start in production mode** (for production)
4. Select a location for your database
5. Click **Enable**

### 3. Enable Firebase Storage

1. In your Firebase project, go to **Build** > **Storage**
2. Click **Get started**
3. Choose **Start in test mode** (for development) or **Start in production mode** (for production)
4. Click **Next** and then **Done**

### 4. Get Your Firebase Configuration

1. In your Firebase project, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app with a nickname
5. Copy the Firebase configuration object

### 5. Configure Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBrotKP6Eu4ETzkvpaQmoAOWUjXPEFZvMw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=skillcity-finflow.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=skillcity-finflow
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=skillcity-finflow.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=623969469942
NEXT_PUBLIC_FIREBASE_APP_ID=1:623969469942:web:fdb8925b58f7722d5af3d7
```

**Important:** 
- The `.env.local` file should be in the root directory of your project
- Never commit `.env.local` to version control (it should be in `.gitignore`)
- Restart your development server after creating or updating `.env.local`
- The storage bucket uses the new Firebase Storage format: `skillcity-finflow.firebasestorage.app`

### 6. Set Up Firestore Security Rules (Production)

For production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /invoices/{invoiceId} {
      allow read, write: if request.auth != null; // Require authentication
      // Or use custom rules based on your needs
    }
  }
}
```

### 7. Set Up Storage Security Rules (Production)

For production, update your Storage security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /receipts/{allPaths=**} {
      allow read: if true; // Allow public read access
      allow write: if request.auth != null; // Require authentication for writes
      // Or use custom rules based on your needs
    }
  }
}
```

## Firebase Project Information

- **Project Name:** skillcity-finflow
- **Project ID:** skillcity-finflow
- **Project Type:** Financial Management System
- **API Key:** AIzaSyBrotKP6Eu4ETzkvpaQmoAOWUjXPEFZvMw
- **Messaging Sender ID:** 623969469942
- **App ID:** 1:623969469942:web:fdb8925b58f7722d5af3d7
- **Storage Bucket:** skillcity-finflow.firebasestorage.app

## Project Structure

- `src/lib/firebase/config.ts` - Firebase initialization and configuration
- `src/lib/firebase/invoices.ts` - Invoice CRUD operations
- `src/lib/firebase/storage.ts` - File upload/download operations

## Usage

The Firebase integration is already set up in the Invoices component. When you:

- **View invoices**: Data is loaded from Firestore
- **Add an invoice**: Data is saved to Firestore and receipt files are uploaded to Storage
- **Filter/search**: Operations are performed on data from Firestore

## Troubleshooting

1. **"Firebase: Error (auth/configuration-not-found)"**
   - Make sure your `.env.local` file exists and contains all required variables
   - Restart your development server after adding environment variables

2. **"Permission denied" errors**
   - Check your Firestore and Storage security rules
   - For development, you can use test mode rules

3. **File upload fails**
   - Ensure Firebase Storage is enabled in your project
   - Check Storage security rules allow writes

## Next Steps

- Consider adding Firebase Authentication for user management
- Implement update and delete functionality for invoices
- Add real-time listeners for live updates
- Set up proper security rules for production


