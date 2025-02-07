const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const vision = require("@google-cloud/vision");

// Initialize Firebase Admin SDK with Storage Bucket
initializeApp({
  storageBucket: "products-2025-35a50.appspot.com"
});

const client = new vision.ImageAnnotatorClient();

// Function triggers when a receipt image is uploaded to Firebase Storage
exports.extractReceiptText = onObjectFinalized(async (event) => {
  const filePath = `gs://${event.data.bucket}/${event.data.name}`;

  try {
    // Send image to Google Vision API
    const [result] = await client.textDetection(filePath);
    const text = result.textAnnotations[0]?.description || "No text detected.";

    console.log("Extracted Text:", text);

    // Save extracted text to Firestore
    const db = getFirestore();
    await db.collection("receipts").doc(event.data.name).set({ text });

    return null;
  } catch (error) {
    console.error("Error extracting text:", error);
    return null;
  }
});
