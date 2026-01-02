import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc,
  writeBatch,
  limit,
  query
} from "firebase/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
// __dirname is available in CommonJS context when using tsx/ts-node
const envPath = path.join(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

// Initialize Firebase with client SDK
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error("❌ Missing Firebase configuration. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local");
  process.exit(1);
}

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log("✅ Firebase initialized");
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

// Collections to preserve (case-insensitive)
const PRESERVED_COLLECTIONS = ["users"];

// Batch size for deletions (Firestore limit is 500)
const BATCH_SIZE = 500;

/**
 * Delete all documents in a collection
 */
async function deleteCollection(collectionName: string): Promise<number> {
  const collectionRef = collection(db, collectionName);
  let deletedCount = 0;
  let batchCount = 0;

  console.log(`\n🗑️  Deleting collection: ${collectionName}`);

  while (true) {
    // Get a batch of documents
    const q = query(collectionRef, limit(BATCH_SIZE));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      break;
    }

    // Create a batch write
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnapshot) => {
      batch.delete(doc(db, collectionName, docSnapshot.id));
      deletedCount++;
    });

    // Commit the batch
    await batch.commit();
    batchCount++;
    console.log(`   ✓ Deleted batch ${batchCount} (${deletedCount} documents so far)`);

    // If we got fewer documents than the limit, we're done
    if (snapshot.size < BATCH_SIZE) {
      break;
    }
  }

  console.log(`   ✅ Completed: ${deletedCount} documents deleted from ${collectionName}`);
  return deletedCount;
}

/**
 * Get all collection names from Firestore
 */
async function getAllCollections(): Promise<string[]> {
  const collections: string[] = [];
  
  try {
    // Use the known collections from the codebase and firestore.rules
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
      "chatGroups", // From chat.ts
      "messages",
      "activityLogs",
      "tasks",
      "cleaningTracker",
      "products",
      "categories",
      "employeeLocations",
    ];

    // Check which collections actually exist by trying to read from them
    for (const collectionName of knownCollections) {
      try {
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, limit(1));
        const snapshot = await getDocs(q);
        // If we can read it, it exists (or might be empty)
        collections.push(collectionName);
      } catch (error: any) {
        // Collection might not exist or we don't have permission
        // We'll still try to delete it in case it exists
        if (error.code !== "permission-denied") {
          collections.push(collectionName);
        }
      }
    }

    return collections;
  } catch (error) {
    console.error("Error getting collections:", error);
    throw error;
  }
}

/**
 * Main function to delete all collections except users
 * 
 * NOTE: This script uses the Firebase Client SDK and requires admin authentication.
 * Make sure you're authenticated as an admin user, or use Firebase Admin SDK instead.
 */
async function deleteAllCollectionsExceptUsers() {
  console.log("🚀 Starting deletion of all collections except 'users'...\n");
  console.log("⚠️  WARNING: This will permanently delete all data except the users collection!");
  console.log("⚠️  Make sure you have a backup if needed!\n");
  console.log("ℹ️  Note: This script requires admin permissions to delete collections.\n");

  try {
    // Get all collections
    const collections = await getAllCollections();
    
    // Filter out preserved collections
    const collectionsToDelete = collections.filter(
      (name) => !PRESERVED_COLLECTIONS.some(
        (preserved) => preserved.toLowerCase() === name.toLowerCase()
      )
    );

    if (collectionsToDelete.length === 0) {
      console.log("✅ No collections to delete (or all collections are preserved)");
      return;
    }

    console.log(`📋 Found ${collectionsToDelete.length} collection(s) to delete:`);
    collectionsToDelete.forEach((name) => console.log(`   - ${name}`));
    console.log(`\n📋 Preserved collection(s):`);
    PRESERVED_COLLECTIONS.forEach((name) => console.log(`   - ${name}`));

    let totalDeleted = 0;
    const results: { collection: string; count: number }[] = [];

    // Delete each collection
    for (const collectionName of collectionsToDelete) {
      try {
        const count = await deleteCollection(collectionName);
        totalDeleted += count;
        results.push({ collection: collectionName, count });
      } catch (error: any) {
        console.error(`   ❌ Error deleting ${collectionName}:`, error.message);
        results.push({ collection: collectionName, count: 0 });
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 DELETION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total collections processed: ${collectionsToDelete.length}`);
    console.log(`Total documents deleted: ${totalDeleted}`);
    console.log("\nDetails:");
    results.forEach(({ collection, count }) => {
      const status = count > 0 ? "✅" : "⚠️ ";
      console.log(`   ${status} ${collection}: ${count} documents`);
    });
    console.log("\n✅ Deletion completed!");
  } catch (error) {
    console.error("\n❌ Error during deletion:", error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  deleteAllCollectionsExceptUsers()
    .then(() => {
      console.log("\n✨ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Script failed:", error);
      process.exit(1);
    });
}

export default deleteAllCollectionsExceptUsers;
