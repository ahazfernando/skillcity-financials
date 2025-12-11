// Quick script to check if environment variables are loaded from .env.local
// This reads the .env.local file directly to verify it exists and has the right format

const fs = require('fs');
const path = require('path');

console.log("🔍 Checking Firebase Environment Variables from .env.local\n");
console.log("=".repeat(60));

const envLocalPath = path.join(process.cwd(), '.env.local');

// Check if .env.local exists
if (!fs.existsSync(envLocalPath)) {
  console.log("❌ .env.local file not found!");
  console.log(`   Expected location: ${envLocalPath}`);
  console.log("\n📝 To fix this:");
  console.log("   1. Create a .env.local file in the project root");
  console.log("   2. Add all Firebase environment variables");
  console.log("   3. Restart your dev server");
  process.exit(1);
}

console.log(`✅ Found .env.local at: ${envLocalPath}\n`);

// Read and parse .env.local
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const envLines = envContent.split('\n').filter(line => {
  const trimmed = line.trim();
  return trimmed && !trimmed.startsWith('#');
});

const vars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const foundVars = {};
let allPresent = true;

// Parse .env.local file
envLines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
    foundVars[key] = value;
  }
});

// Check each required variable
vars.forEach(v => {
  const val = foundVars[v];
  if (val && val.length > 0) {
    const display = v.includes('API_KEY') ? val.substring(0, 20) + '...' : val;
    console.log(`✅ ${v}: ${display}`);
    
    // Validate API key format
    if (v === 'NEXT_PUBLIC_FIREBASE_API_KEY' && !val.startsWith('AIza')) {
      console.log(`   ⚠️  WARNING: API key should start with "AIza"`);
    }
  } else {
    console.log(`❌ ${v}: MISSING or empty`);
    allPresent = false;
  }
});

console.log("=".repeat(60));

if (allPresent) {
  console.log("\n✅ All variables are set in .env.local!");
  console.log("\n⚠️  IMPORTANT: If you're still getting errors:");
  console.log("   1. STOP your dev server (press Ctrl+C in the terminal)");
  console.log("   2. RESTART it with: npm run dev");
  console.log("   3. Clear your browser cache or use incognito mode");
  console.log("   4. Visit http://localhost:3001/firebase-debug to see what's loaded");
} else {
  console.log("\n❌ Some variables are missing or empty!");
  console.log("   Make sure your .env.local file contains all required variables:");
  vars.forEach(v => {
    if (!foundVars[v] || foundVars[v].length === 0) {
      console.log(`   - ${v}`);
    }
  });
  console.log("\n📝 Example format:");
  console.log("   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...");
  console.log("   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com");
}



