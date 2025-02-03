import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'products-2025-35a50-firebase-adminsdk-fbsvc-11bef4927f.json'))
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function verifyAdmin() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Please provide a user ID as an argument');
    process.exit(1);
  }

  try {
    const adminDoc = await db.collection('admins').doc(userId).get();
    if (!adminDoc.exists) {
      console.log('Admin document does not exist');
      process.exit(1);
    }

    const adminData = adminDoc.data();
    console.log('Admin document exists:', adminData);
    process.exit(0);
  } catch (error) {
    console.error('Error verifying admin:', error);
    process.exit(1);
  }
}

verifyAdmin();
