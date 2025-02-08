const { onObjectFinalized } = require("firebase-functions/v2/storage");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");

// Initialize Firebase Admin SDK
admin.initializeApp();

const client = new vision.ImageAnnotatorClient();

async function deleteFile(bucket, filename) {
  try {
    const file = admin.storage().bucket(bucket).file(filename);
    
    // Check if file exists before attempting deletion
    const [exists] = await file.exists();
    if (!exists) {
      console.log(`File ${filename} does not exist`);
      return;
    }
    
    console.log(`Attempting to delete file: ${filename}`);
    await file.delete();
    console.log(`Successfully deleted file: ${filename}`);
  } catch (error) {
    console.error(`Error deleting file ${filename}:`, error);
    throw error; // Re-throw to handle in the main function
  }
}

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

    // Get just the filename without the path
    const filename = event.data.name.split('/').pop();
    
    // Save extracted text to Firestore
    await admin.firestore().collection("receipts").doc(filename).set({ 
      text,
      timestamp: new Date().toISOString(),
      status: "completed"
    });
    console.log("Saved to Firestore successfully");

    // Delete the file from Storage
    await deleteFile(event.data.bucket, event.data.name);

    return null;
  } catch (error) {
    console.error("Error processing image:", error);
    
    // Get just the filename without the path
    const filename = event.data.name.split('/').pop();
    
    // Save error to Firestore
    await admin.firestore().collection("receipts").doc(filename).set({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      status: "error"
    });

    // Try to delete the file even if processing failed
    try {
      await deleteFile(event.data.bucket, event.data.name);
    } catch (deleteError) {
      console.error("Final attempt to delete file failed:", deleteError);
    }
    
    return null;
  }
});
