const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

‎// نویسنده
const author = "ehsan fazli";

‎// لیست مدل‌ها (alias → مدل واقعی)

const models = {
  "llama4-maverick": "meta-llama/Llama-4-Maverick-Instruct-17Bx128E",
  "llama4-scout": "meta-llama/Llama-4-Scout-Instruct-17Bx16E",
  "llama3-70b": "meta-llama/Llama-3-70B-Instruct",
  "llama3-8b": "meta-llama/Llama-3-8B-Instruct",
  "llama3-free": "meta-llama/Llama-3-70B-Instruct-Turbo-Free",
  "mixtral": "mistralai/Mixtral-8x7B-Instruct-v0.1",
  "gemma": "google/gemma-7b-it",
  "deepseek": "deepseek-ai/deepseek-coder-33b-instruct",
  "claude-opus": "anthropic/claude-3-opus-20240229",
  "mistral-small": "mistralai/Mistral-Small-24B-Instruct-25.01",
  "qwen-32b": "qwen/qwen-qwq-32b",
  "qwen-72b": "qwen/qwen2-vl-72b-instruct",
  "mistral-7b": "mistralai/mistral-7b-instruct",
  "gemma-2b": "google/gemma-instruct-2b",
  "meta-llama-3.1-8b": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
  "meta-llama-3.3-70b": "meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo",
  "deepseek-r1-distill": "deepseek-ai/deepseek-r1-distill-llama-70b",
  "qwen2.5-72b": "qwen/qwen2.5-72b-instruct",
  "gemma-13b": "google/gemma-instruct-13b"
};

// API Keyهای چرخشی
const apiKeys = [
  process.env.KEY1,
  process.env.KEY2,
  process.env.KEY3,
  process.env.KEY4,
  process.env.KEY5,
  process.env.KEY5
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
