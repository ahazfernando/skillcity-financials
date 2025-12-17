// Test script to verify Next.js will load environment variables
// Run this before starting the dev server

const fs = require('fs');
const path = require('path');

console.log("🧪 Testing Environment Variable Setup for Next.js\n");
console.log("=".repeat(60));

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error("❌ .env.local file not found!");
  console.error(`   Expected at: ${envPath}`);
  process.exit(1);
}

console.log(`✅ .env.local found at: ${envPath}\n`);

// Read and parse the file
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n').filter(line => {
  const trimmed = line.trim();
  return trimmed && !trimmed.startsWith('#');
});

console.log(`📄 File contains ${lines.length} non-empty lines\n`);

// Check for required variables
const required = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const found = {};
lines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    found[key] = value;
  }
});

let allGood = true;
required.forEach(key => {
  if (found[key] && found[key].length > 0) {
    const display = key.includes('API_KEY') 
      ? found[key].substring(0, 20) + '...' 
      : found[key];
    console.log(`✅ ${key}: ${display}`);
  } else {
    console.log(`❌ ${key}: MISSING`);
    allGood = false;
  }
});

console.log("\n" + "=".repeat(60));

if (allGood) {
  console.log("\n✅ All environment variables are correctly set!");
  console.log("\n📝 IMPORTANT: Next.js embeds NEXT_PUBLIC_ variables at BUILD TIME");
  console.log("   This means you MUST restart the dev server after creating/updating .env.local");
  console.log("\n🚀 Next steps:");
  console.log("   1. Make sure your dev server is COMPLETELY stopped (Ctrl+C)");
  console.log("   2. Run: npm run dev:clean");
  console.log("   3. Look for 'Firebase initialized successfully' in the console");
  console.log("   4. Open http://localhost:3000/firebase-debug to verify client-side");
  console.log("\n💡 If it still doesn't work:");
  console.log("   - Check browser console for errors");
  console.log("   - Try incognito/private browsing mode");
  console.log("   - Verify the port matches (check your terminal output)");
} else {
  console.log("\n❌ Some variables are missing!");
  console.log("   Please check your .env.local file format.");
  process.exit(1);
}








