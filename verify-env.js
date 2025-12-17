// Quick script to verify Firebase environment variables
// Run with: node verify-env.js

const expectedValues = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyBrotKP6Eu4ETzkvpaQmoAOWUjXPEFZvMw",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "skillcity-finflow.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "skillcity-finflow",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "skillcity-finflow.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "623969469942",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:623969469942:web:fdb8925b58f7722d5af3d7",
};

const providedValues = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyBrotKP6Eu4ETzkvpaQmoAOWUjXPEFZvMw",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "skillcity-finflow.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "skillcity-finflow",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "skillcity-finflow.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "623969469942",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:623969469942:web:fdb8925b58f7722d5af3d7",
};

console.log("🔍 Verifying Firebase Environment Variables\n");
console.log("=" .repeat(60));

let allMatch = true;

for (const [key, expectedValue] of Object.entries(expectedValues)) {
  const providedValue = providedValues[key];
  const matches = expectedValue === providedValue;
  
  if (matches) {
    console.log(`✅ ${key}`);
    console.log(`   Expected: ${expectedValue}`);
    console.log(`   Provided: ${providedValue}`);
  } else {
    console.log(`❌ ${key}`);
    console.log(`   Expected: ${expectedValue}`);
    console.log(`   Provided: ${providedValue}`);
    allMatch = false;
  }
  console.log("");
}

console.log("=" .repeat(60));
if (allMatch) {
  console.log("✅ All Firebase environment variables match!");
} else {
  console.log("❌ Some variables don't match. Please check your .env.local file.");
}

console.log("\n📝 Note: The value 'dh4k9377k' you provided is not a standard Firebase env variable.");
console.log("   It might be a Google Analytics Measurement ID or another identifier.");













