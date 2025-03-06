const { onRequest } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const functions = require("firebase-functions");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Define configuration parameters
const geminiApiKey = defineString('GEMINI_API_KEY');

// Initialize Gemini with API key from environment
const genAI = new GoogleGenerativeAI(geminiApiKey.value());

// Add the new searchProducts function with region specification
exports.searchProducts = onRequest({ 
  region: 'us-central1',
  maxInstances: 10
}, async (req, res) => {
  try {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }

    // Get the search query from the request data
    const { data } = req.body;
    if (!data || !data.query) {
      console.error('Missing query in request data');
      res.status(400).json({ error: 'Search query is required in request data' });
      return;
    }

    const { query } = data;
    console.log('Processing query:', query);

    // Get Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    console.log('Gemini model initialized');

    // Prepare prompt
    const prompt = `
    Search for products that are specifically made in Canada (Product of Canada) about "${query}". Return ONLY valid JSON in this exact format, with no additional text or explanation:
    {
      "results": [
        {
          "name": "Product Name",
          "description": "Brief product description",
          "category": "Product category",
          "website": "Official Canadian product website or major Canadian retailer URL",
          "manufacturer": "Company that makes the product",
          "origin": {
            "madeInCanada": true,
            "productOfCanada": true,
            "manufacturingLocation": "City, Province, Canada"
          },
          "keyFeatures": ["feature1", "feature2", "feature3"]
        }
      ]
    }

    Rules:
    1. ONLY include products that are officially "Product of Canada" (98% or more of production costs are Canadian)
    2. EXCLUDE any products manufactured in the USA
    3. Include manufacturing location when available (City, Province)
    4. Prioritize products from Canadian-owned companies
    5. Include Canadian retailer URLs when possible
    6. Return EXACTLY 5 most relevant results
    7. MUST return valid JSON that can be parsed
    8. ALL fields must be present, use null for unknown values
    `;

    console.log('Sending prompt to Gemini');
    const result = await model.generateContent(prompt);
    console.log('Got response from Gemini');
    const response = await result.response;
    const text = response.text();
    console.log('Raw Gemini response:', text);

    // Parse response
    let searchResults;
    try {
      // Clean up the response - remove any markdown code blocks and extra whitespace
      const cleanText = text.replace(/```json\s*|\s*```/gi, '').trim();
      console.log('Cleaned text:', cleanText);
      searchResults = JSON.parse(cleanText);
      
      // Validate response structure
      if (!searchResults || !Array.isArray(searchResults.results)) {
        throw new Error('Invalid response structure from Gemini API');
      }

      // Ensure all required fields are present
      searchResults.results = searchResults.results.map(result => ({
        name: result.name || 'Unknown Product',
        description: result.description || 'No description available',
        category: result.category || 'Uncategorized',
        website: result.website || null,
        manufacturer: result.manufacturer || 'Unknown Manufacturer',
        origin: {
          madeInCanada: true,
          productOfCanada: true,
          manufacturingLocation: result.origin?.manufacturingLocation || null
        },
        keyFeatures: Array.isArray(result.keyFeatures) ? result.keyFeatures : []
      }));

    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      console.error('Raw text that failed to parse:', text);
      throw new Error('Invalid response from Gemini API');
    }

    // Return results
    res.status(200).json({
      data: searchResults
    });

  } catch (error) {
    console.error('Search products error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: {
        message: error.message || 'An unexpected error occurred',
        details: error.stack
      }
    });
  }
});

/**
 * Updates the public stats document with current counts
 */
exports.updatePublicStats = functions.pubsub
  .schedule('every 1 hours')  // Changed to hourly to reduce costs
  .onRun(async (context) => {
    try {
      console.log('Starting public stats update...');
      
      // Get count of active users
      const usersSnapshot = await admin
        .firestore()
        .collection('users')
        .where('status', '==', 'active')
        .get();
      
      console.log('Found active users:', usersSnapshot.size);
      
      // Get count of Canadian products and public products
      const productsSnapshot = await admin
        .firestore()
        .collection('canadian_products')
        .get();
      
      const totalProducts = productsSnapshot.size;
      const publicProducts = productsSnapshot.docs.filter(
        doc => doc.data().isPubliclyVisible === true
      ).length;
      
      console.log('Product counts:', { total: totalProducts, public: publicProducts });
      
      // Update the public stats document
      await admin.firestore()
        .doc('public_stats/user_counts')
        .set({
          activeUsers: usersSnapshot.size,
          totalProducts,
          publicProducts,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
      
      console.log('Public stats updated successfully');
      return null;
    } catch (error) {
      console.error('Error updating public stats:', error);
      throw error;
    }
  });

/**
 * Also update stats when user status changes
 */
exports.onUserStatusChange = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    // Only update if status field changed
    const oldStatus = change.before.data()?.status;
    const newStatus = change.after.data()?.status;
    
    if (oldStatus === newStatus) {
      return null;
    }
    
    // Trigger the stats update
    try {
      await exports.updatePublicStats.run();
      console.log('Public stats updated after user status change');
    } catch (error) {
      console.error('Error updating stats after user change:', error);
      throw error;
    }
  });

// Import email automation functions
const emailAutomation = require('./lib/emailAutomation.js');

// Export email automation functions
exports.processScheduledEmails = emailAutomation.processScheduledEmails;
exports.processEventTriggeredEmail = emailAutomation.processEventTriggeredEmail;
exports.retryFailedEmails = emailAutomation.retryFailedEmails;