"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFirebaseConfigForDebug } from "@/lib/firebase/config";

export default function FirebaseDebugPage() {
  const [config, setConfig] = useState<any>(null);
  const [envVars, setEnvVars] = useState<any>(null);

  useEffect(() => {
    // Get config from Firebase module
    const firebaseConfig = getFirebaseConfigForDebug();
    setConfig(firebaseConfig);

    // Get raw env vars (what Next.js sees)
    const rawEnvVars = {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY
        ? `${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 20)}...`
        : "MISSING",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "MISSING",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "MISSING",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "MISSING",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "MISSING",
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "MISSING",
    };
    setEnvVars(rawEnvVars);
  }, []);

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Firebase Configuration Debug</CardTitle>
          <CardDescription>
            This page helps diagnose Firebase configuration issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Environment Variables (from Next.js)</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(envVars, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Firebase Config (from config.ts)</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Troubleshooting Steps:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
              <li>If variables show as "MISSING", check your .env.local file exists in the project root</li>
              <li>Make sure .env.local contains all NEXT_PUBLIC_FIREBASE_* variables</li>
              <li><strong>RESTART your dev server</strong> after updating .env.local (Ctrl+C, then npm run dev)</li>
              <li>Clear browser cache or use incognito mode</li>
              <li>Verify the API key in Firebase Console matches what's in .env.local</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h4 className="font-semibold text-blue-800 mb-2">📝 Expected Values:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
              <li>API Key should start with: AIzaSy...</li>
              <li>Auth Domain: skillcity-finflow.firebaseapp.com</li>
              <li>Project ID: skillcity-finflow</li>
              <li>Storage Bucket: skillcity-finflow.firebasestorage.app</li>
              <li>Messaging Sender ID: 623969469942</li>
              <li>App ID: 1:623969469942:web:fdb8925b58f7722d5af3d7</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
























