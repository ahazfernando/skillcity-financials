import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import * as dotenv from "dotenv";
import * as path from "path";
import { vehicleSeedData } from "../src/lib/vehicle-seed-data";

const envPath = path.join(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error("Missing Firebase configuration. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local");
  process.exit(1);
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const PRODUCTS_COLLECTION = "products";

async function deleteAllProducts(): Promise<number> {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  return snapshot.size;
}

async function seedVehicles() {
  console.log("Deleting all existing equipment/vehicle records...");
  const deleted = await deleteAllProducts();
  console.log(`Deleted ${deleted} record(s).`);

  console.log("Seeding vehicle data...");
  for (const vehicle of vehicleSeedData) {
    await addDoc(collection(db, PRODUCTS_COLLECTION), {
      equipmentCode: vehicle.equipmentCode,
      name: vehicle.name,
      category: vehicle.category,
      quantity: vehicle.quantity,
      description: vehicle.description || "",
      imageUrl: vehicle.imageUrl || "",
      repairs: [],
      siteIds: vehicle.siteIds || [],
      employeeIds: vehicle.employeeIds || [],
      vehicleStatus: vehicle.vehicleStatus || null,
      make: vehicle.make || null,
      body: vehicle.body || null,
      colour: vehicle.colour || null,
      year: vehicle.year ?? null,
      expiry: vehicle.expiry || null,
      vin: vehicle.vin || null,
      engine: vehicle.engine || null,
      registrationSerial: vehicle.registrationSerial || null,
      compliancePlate: vehicle.compliancePlate || null,
      sanctions: vehicle.sanctions || null,
      goodsCarryingVehicle: vehicle.goodsCarryingVehicle ?? false,
      transferInDispute: vehicle.transferInDispute ?? false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`  Added ${vehicle.equipmentCode} - ${vehicle.name}`);
  }

  console.log(`\nDone. Seeded ${vehicleSeedData.length} vehicles.`);
}

seedVehicles().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
