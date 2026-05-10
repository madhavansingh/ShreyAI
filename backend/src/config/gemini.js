/**
 * config/gemini.js — now a shim that forwards to NVIDIA NIM.
 * All existing `require('./config/gemini')` imports continue to work.
 */

const { nvidia, NVIDIA_MODEL } = require('./nvidia');

// Drop-in replacement: geminiFlash is now the NVIDIA chat client wrapper
const geminiFlash = {
  /**
   * generateContent(promptOrObject) → { response: { text() } }
   * Matches the Gemini SDK surface used in aiMetaService.js
   */
  async generateContent(promptOrObject) {
    const userText = typeof promptOrObject === 'string'
      ? promptOrObject
      : promptOrObject?.contents?.map(c => c.parts?.map(p => p.text).join('')).join('\n') || '';

    const systemText = typeof promptOrObject === 'object'
      ? promptOrObject?.systemInstruction || ''
      : '';

    const messages = [];
    if (systemText) messages.push({ role: 'system', content: systemText });

    // Include conversation history if present
    if (typeof promptOrObject === 'object' && promptOrObject?.contents) {
      for (const c of promptOrObject.contents) {
        const role = c.role === 'model' ? 'assistant' : 'user';
        messages.push({ role, content: c.parts?.map(p => p.text).join('') || '' });
      }
    } else {
      messages.push({ role: 'user', content: userText });
    }

    const completion = await nvidia.chat.completions.create({
      model:       NVIDIA_MODEL,
      messages,
      temperature: 0.3,
      max_tokens:  4096,
    });

    const text = completion.choices[0]?.message?.content || '';
    return { response: { text: () => text } };
  },

  /**
   * generateContentStream(opts) → async iterable of chunks
   * Matches the Gemini SDK streaming surface used in chatService.js
   */
  async generateContentStream(opts) {
    const messages = [];
    if (opts.systemInstruction) {
      messages.push({ role: 'system', content: opts.systemInstruction });
    }
    for (const c of (opts.contents || [])) {
      const role = c.role === 'model' ? 'assistant' : 'user';
      messages.push({ role, content: c.parts?.map(p => p.text).join('') || '' });
    }

    const stream = await nvidia.chat.completions.create({
      model:       NVIDIA_MODEL,
      messages,
      temperature: opts.generationConfig?.temperature ?? 0.35,
      max_tokens:  opts.generationConfig?.maxOutputTokens ?? 1500,
      stream:      true,
    });

    // Return Gemini-compatible async iterable
    return {
      stream: (async function* () {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) yield { text: () => text };
        }
      })(),
    };
  },
};

console.log('✅ Gemini shim → NVIDIA NIM initialized');

module.exports = { geminiFlash };
