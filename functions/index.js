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
  console.log("Function triggered for file:", event.data.name);
  const filePath = `gs://${event.data.bucket}/${event.data.name}`;
  console.log("Processing file:", filePath);

  try {
    // Send image to Google Vision API
    console.log("Sending to Vision API...");
    const [result] = await client.textDetection(filePath);
    const text = result.textAnnotations[0]?.description || "No text detected.";

    console.log("Extracted Text:", text);

    // Save extracted text to Firestore
    const db = getFirestore();
    await db.collection("receipts").doc(event.data.name).set({ 
      text,
      timestamp: new Date().toISOString(),
      status: "completed"
    });
    console.log("Saved to Firestore successfully");

    return null;
  } catch (error) {
    console.error("Error processing image:", error);
    
    // Save error to Firestore
    const db = getFirestore();
    await db.collection("receipts").doc(event.data.name).set({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      status: "error"
    });
    
    return null;
  }
});
