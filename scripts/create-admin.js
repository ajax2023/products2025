import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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

async function createAdmin() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Please provide a user ID as an argument');
    process.exit(1);
  }

  try {
    await db.collection('admins').doc(userId).set({
      _id: userId,
      user_id: userId,
      roles: ['super_admin', 'product_admin', 'price_admin', 'company_admin'],
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      created_by: 'system',
      status: 'active'
    });
    console.log(`Admin user ${userId} created successfully`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
