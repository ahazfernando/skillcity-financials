// Script to verify Next.js can read environment variables
// This simulates what Next.js does during build

require('dotenv').config({ path: '.env.local' });

console.log("🔍 Verifying Next.js Environment Variable Loading\n");
console.log("=".repeat(60));

const vars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

let allPresent = true;

vars.forEach(v => {
  const val = process.env[v];
  if (val && val.trim().length > 0) {
    const display = v.includes('API_KEY') ? val.substring(0, 20) + '...' : val;
    console.log(`✅ ${v}: ${display}`);
  } else {
    console.log(`❌ ${v}: MISSING or empty`);
    allPresent = false;
  }
});

console.log("=".repeat(60));

if (allPresent) {
  console.log("\n✅ All variables are accessible!");
  console.log("\n📝 Next steps:");
  console.log("   1. Make sure your dev server is STOPPED");
  console.log("   2. Run: npm run dev:clean");
  console.log("   3. Wait for 'Firebase initialized successfully' in the console");
  console.log("   4. Open http://localhost:3000/firebase-debug to verify client-side loading");
} else {
  console.log("\n❌ Some variables are missing!");
  console.log("   Check your .env.local file format.");
}










