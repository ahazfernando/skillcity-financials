import { NextRequest, NextResponse } from "next/server";

let db: any = null;
let adminInitialized = false;

async function initializeAdmin() {
  if (adminInitialized) return db;

  try {
    const admin = await import("firebase-admin/app");
    const firestore = await import("firebase-admin/firestore");
    const { initializeApp, getApps, cert } = admin;
    const { getFirestore } = firestore;

    if (getApps().length === 0) {
      // Try to use service account from environment variable
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Use credentials file path
        initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } else {
        // Try application default credentials
        initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      }
    }

    db = getFirestore();
    adminInitialized = true;
    return db;
  } catch (error: any) {
    console.error("Failed to initialize Firebase Admin:", error);
    throw new Error(
      "Firebase Admin SDK not properly configured. " +
      "Please install firebase-admin and set up service account credentials. " +
      "Error: " + error.message
    );
  }
}

const PRESERVED_COLLECTIONS = ["users"];
const BATCH_SIZE = 500;

async function deleteCollection(collectionName: string, db: any): Promise<number> {
  const collectionRef = db.collection(collectionName);
  let deletedCount = 0;
  let batchCount = 0;

  while (true) {
    const snapshot = await collectionRef.limit(BATCH_SIZE).get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();
    batchCount++;

    if (snapshot.size < BATCH_SIZE) {
      break;
    }
  }

  return deletedCount;
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Admin SDK
    const firestoreDb = await initializeAdmin();

    const knownCollections = [
      "employees",
      "workRecords",
      "workHours",
      "employeeTimesheets",
      "employeePayRates",
      "bankDetails",
      "leaveRequests",
      "invoices",
      "payroll",
      "expenses",
      "sites",
      "clients",
      "siteEmployeeAllocations",
      "reminders",
      "groups",
      "chatGroups",
      "messages",
      "activityLogs",
      "tasks",
      "cleaningTracker",
      "cleaningtracker", // Also check lowercase version
      "products",
      "categories",
      "employeeLocations",
    ];

    const collectionsToDelete = knownCollections.filter(
      (name) => !PRESERVED_COLLECTIONS.some(
        (preserved) => preserved.toLowerCase() === name.toLowerCase()
      )
    );

    const results: { collection: string; count: number; error?: string }[] = [];
    let totalDeleted = 0;

    for (const collectionName of collectionsToDelete) {
      try {
        const count = await deleteCollection(collectionName, firestoreDb);
        totalDeleted += count;
        results.push({ collection: collectionName, count });
      } catch (error: any) {
        results.push({ 
          collection: collectionName, 
          count: 0, 
          error: error.message 
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Deletion completed",
      totalDeleted,
      results,
    });
  } catch (error: any) {
    console.error("Error deleting collections:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to delete collections" 
      },
      { status: 500 }
    );
  }
}
