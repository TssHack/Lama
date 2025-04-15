const express = require('express');
const axios = require('axios');
require('dotenv').config(); // To read environment variables like API keys

const app = express();
app.use(express.json()); // To parse JSON from request bodies

// Author (constant)
const author = "ehsan fazli"; // Kept the original name as requested

// Model list (user-friendly alias -> actual Together AI model name)
// Note: Aliases are lowercased for easier comparison
const models = {
  "llama4-maverick": "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  "llama4-scout": "meta-llama/Llama-4-Scout-17B-16E-Instruct",
  "llama3-70b": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  "llama3-8b": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo-classifier",
  "llama3-free": "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
  "mixtral": "meta-llama/Llama-Vision-Free", // Note: This name might differ from the actual Mixtral model. Please verify.
  "gemma": "google/gemma-2b-it",
  "deepseek": "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free"
};

// Read API keys from environment variables
// .filter(Boolean) removes undefined or empty keys
const apiKeys = [
  process.env.KEY1,
  process.env.KEY2,
  process.env.KEY3,
  process.env.KEY4,
  process.env.KEY5,
  process.env.KEY6
].filter(Boolean);

// Check if at least one API key exists
if (apiKeys.length === 0) {
  console.error("Error: No valid API keys found in the .env file. Please set KEY1, KEY2, ... variables.");
  process.exit(1); // Exit the application with an error code
}

let currentKeyIndex = 0;

// Function to get the next API key in a round-robin fashion
function getNextApiKey() {
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length; // Rotate to the next key
  return key;
}

// Endpoint to display the list of available models
app.get('/models', (req, res) => {
  res.json({
    author,
    available_models: Object.keys(models) // Return only the aliases
  });
});

// Main function to handle chat requests (for both GET and POST)
async function handleChatRequest(req, res) {
  // Extract model and prompt from query string (for GET) or body (for POST)
  const modelAlias = req.method === 'GET' ? req.query.model : req.body.model;
  const prompt = req.method === 'GET' ? req.query.prompt : req.body.prompt;

  // --- Input Validation ---
  if (!modelAlias || !prompt) {
    return res.status(400).json({ // 400 Bad Request status code
      author,
      error: "Both 'model' and 'prompt' parameters are required."
    });
  }

  // Find the actual model name from the alias (lowercase)
  const togetherModelName = models[modelAlias.toLowerCase()];
  if (!togetherModelName) {
    return res.status(400).json({ // 400 Bad Request status code
      author,
      error: `Invalid model name: '${modelAlias}'. Available models: ${Object.keys(models).join(', ')}`
    });
  }

  // --- Prepare and send request to Together AI ---
  const messages = [{ role: 'user', content: prompt }];
  const apiKey = getNextApiKey(); // Get a rotating API key

  try {
    console.log(`Sending request to Together AI: model=${togetherModelName}, key used (partial)=${apiKey.substring(0, 5)}...`); // Log for debugging

    const response = await axios.post(
      'https://api.together.xyz/v1/chat/completions',
      {
        model: togetherModelName,
        messages: messages,
        // You can add other parameters like max_tokens, temperature, etc. here
        // max_tokens: 1024,
        // temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // Set a timeout (e.g., 60 seconds) to prevent infinite waiting
      }
    );

    // --- Process successful response ---
    // Extract the main response content from the Together AI JSON structure
    // Structure is typically: response.data.choices[0].message.content
    const aiResponseContent = response.data?.choices?.[0]?.message?.content || "";

// حذف تگ <think>...</think> و محتوای داخلش
    const cleanedContent = aiResponseContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    if (cleanedContent) {
      res.json({
        author,
        response: cleanedContent
      });
    } else {
      console.error("Unexpected response structure received from Together AI:", response.data);
      res.status(500).json({
        author,
        error: "Received an invalid response structure from the AI service."
      });
    }

  } catch (err) {
    // --- Handle potential errors ---
    console.error("Error calling Together AI:", err.message); // Log the error server-side

    if (err.response) {
      // Error from the Together AI API (e.g., invalid key, wrong model, their server error)
      console.error("API Error Details:", err.response.data);
      // Return the status code and error message received from the API
      res.status(err.response.status).json({
        author,
        error: `API Error (${err.response.status})`,
        // You can include more details from err.response.data here
        // Be careful not to leak sensitive info (like API keys)
        details: err.response.data?.error?.message || err.response.data || "No further details available."
      });
    } else if (err.request) {
      // Request was made but no response received (e.g., network issue, timeout)
      console.error("Network error or no response received:", err.request);
      res.status(504).json({ // 504 Gateway Timeout status code
        author,
        error: "No response received from AI service (timeout or network issue)."
      });
    } else {
      // Another error occurred during request setup or sending
      console.error("Unknown error:", err.message);
      res.status(500).json({ // 500 Internal Server Error status code
        author,
        error: "Internal server error while processing the request.",
        details: err.message
      });
    }
  }
}

// Endpoint for chat using GET method
// Example: /chat?model=llama3-free&prompt=Hello
app.get('/chat', handleChatRequest);

// Endpoint for chat using POST method
// Example: POST /chat with JSON body: { "model": "llama3-free", "prompt": "Hello" }
app.post('/chat', handleChatRequest);

// Determine port from environment variables or use default 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Chat server successfully running on port ${PORT}`);
  console.log(`Loaded API Keys: ${apiKeys.length}`);
  console.log(`Available models: ${Object.keys(models).join(', ')}`);
});
