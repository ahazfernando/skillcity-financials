import { NextResponse } from "next/server";
import { vehicleSeedData } from "@/lib/vehicle-seed-data";

let db: FirebaseFirestore.Firestore | null = null;
let adminInitialized = false;

async function initializeAdmin() {
  if (adminInitialized && db) return db;

  const admin = await import("firebase-admin/app");
  const firestore = await import("firebase-admin/firestore");
  const { initializeApp, getApps, cert } = admin;
  const { getFirestore } = firestore;

  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  }

  db = getFirestore();
  adminInitialized = true;
  return db;
}

const BATCH_SIZE = 500;

export async function POST() {
  try {
    const firestoreDb = await initializeAdmin();
    const collectionRef = firestoreDb.collection("products");

    let deleted = 0;
    while (true) {
      const snapshot = await collectionRef.limit(BATCH_SIZE).get();
      if (snapshot.empty) break;

      const batch = firestoreDb.batch();
      snapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
        deleted++;
      });
      await batch.commit();
      if (snapshot.size < BATCH_SIZE) break;
    }

    const results: { id: string; plate: string; model: string }[] = [];
    for (const vehicle of vehicleSeedData) {
      const docRef = await collectionRef.add({
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      results.push({ id: docRef.id, plate: vehicle.equipmentCode, model: vehicle.name });
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted} existing record(s) and seeded ${vehicleSeedData.length} vehicles.`,
      deleted,
      seeded: vehicleSeedData.length,
      results,
    });
  } catch (error) {
    console.error("Error seeding vehicles:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
