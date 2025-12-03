# Admin Setup Instructions

## Making a User an Admin

To make `ahaz@skillcity.com.au` an admin, you have two options:

### Option 1: Using the Admin Interface (Recommended)

1. **First, ensure the user has signed up:**
   - The user needs to create an account at `/signup`
   - After signup, they will be in "pending approval" status

2. **Make yourself an admin first (if not already):**
   - Go to Firebase Console > Firestore Database
   - Find the `users` collection
   - Find your user document (by email)
   - Set `isAdmin: true` and `approved: true`

3. **Then approve and make the user admin:**
   - Log in as an admin
   - Go to `/users` page (User Management)
   - Find the user `ahaz@skillcity.com.au`
   - Click "Approve" if pending
   - Click "Make Admin" button

### Option 2: Using Firebase Console (Direct)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database**
4. Navigate to the `users` collection
5. Find the user document with email `ahaz@skillcity.com.au`
6. Edit the document and set:
   - `isAdmin: true`
   - `approved: true`
   - (Optional) `approvedAt: [current timestamp]`

### Option 3: Using the Script

If the user has already signed up, you can use the script:

```bash
npx ts-node scripts/make-email-admin.ts ahaz@skillcity.com.au
```

**Note:** The user must have signed up first for this to work.

## First Admin Setup

If you need to make the first admin user:

1. Sign up with the email you want to be admin
2. Go to Firebase Console > Firestore Database
3. Find your user document in the `users` collection
4. Set:
   - `isAdmin: true`
   - `approved: true`
5. Refresh the app and you'll have admin access


