import firebaseConfig from "./firebase-applet-config.json";

async function test() {
  try {
    const projectId = firebaseConfig.projectId;
    const databaseId = firebaseConfig.firestoreDatabaseId;
    const apiKey = firebaseConfig.apiKey;
    
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/blocked_slots?key=${apiKey}`;
    console.log("Fetching blocked_slots via REST API...");
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`REST API failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    console.log("Success! Data:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Error occurred with REST API:", err);
  }
}

test();
