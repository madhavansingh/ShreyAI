/**
 * config/nvidia.js
 * NVIDIA NIM API client using OpenAI-compatible SDK.
 * Model: nvidia/nemotron-3-nano-30b-a3b
 */

const OpenAI = require('openai');

if (!process.env.NVIDIA_API_KEY) {
  console.error('❌ NVIDIA_API_KEY is missing from environment variables.');
  process.exit(1);
}

const nvidia = new OpenAI({
  apiKey:  process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

const NVIDIA_MODEL = 'nvidia/nemotron-3-nano-30b-a3b';

console.log('✅ NVIDIA NIM initialized — model:', NVIDIA_MODEL);

module.exports = { nvidia, NVIDIA_MODEL };
