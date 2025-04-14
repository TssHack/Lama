const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

‎// نویسنده
const author = "ehsan fazli";

‎// لیست مدل‌ها (alias → مدل واقعی)

const models = {
  "llama4-maverick": "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  "llama4-scout": "meta-llama/Llama-4-Scout-17B-16E-Instruct",
  "llama3-70b": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  "llama3-8b": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo-classifier",
  "llama3-free": "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
  "mixtral": "meta-llama/Llama-Vision-Free",
  "gemma": "google/gemma-2b-it",
  "deepseek": "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free"
};

// API Keyهای چرخشی
const apiKeys = [
  process.env.KEY1,
  process.env.KEY2,
  process.env.KEY3,
  process.env.KEY4,
  process.env.KEY5,
  process.env.KEY6
].filter(Boolean);

let currentKeyIndex = 0;
function getNextApiKey() {
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
}

‎// لیست مدل‌ها
app.get('/models', (req, res) => {
  res.json({
    author,
    models: Object.keys(models)
  });
});

‎// تابع مشترک برای هندل چت
async function handleChat(req, res, model, prompt) {
  try {
    if (!model || !prompt) {
      return res.status(400).json({
        author,
        error: "Both 'model' and 'prompt' are required."
      });
    }

    const togetherModel = models[model.toLowerCase()];
    if (!togetherModel) {
      return res.status(400).json({
        author,
        error: 'Invalid model name.'
      });
    }

    const messages = [{ role: 'user', content: prompt }];
    const apiKey = getNextApiKey();

    const response = await axios.post(
      'https://api.together.xyz/v1/chat/completions',
      { model: togetherModel, messages },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      author,
      response: response.data
    });

  } catch (err) {
    res.status(err.response?.status || 500).json({
      author,
      error: 'Error calling Together API',
      details: err.response?.data || err.message
    });
  }
}

// GET /chat?model=llama3-free&prompt=سلام
app.get('/chat', async (req, res) => {
  const { model, prompt } = req.query;
  await handleChat(req, res, model, prompt);
});

// POST /chat { model: "", prompt: "" }
app.post('/chat', async (req, res) => {
  const { model, prompt } = req.body;
  await handleChat(req, res, model, prompt);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
});
