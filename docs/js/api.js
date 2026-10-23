// LLM bridge. One key box, two backends, chosen by the key itself:
//   - a University of Idaho MindRouter key (prefix "mr2_") goes to MindRouter,
//     an OpenAI-compatible gateway, through the public proxy on the lakehouse VM
//     (MindRouter itself is campus-only, and the proxy adds the CORS headers a
//     page on github.io needs);
//   - any other key is treated as a Google Gemini key and goes to Google via the
//     @google/genai SDK loaded from a CDN.

export const MINDROUTER_BASE_URL = 'https://nlayman-external.insight.uidaho.edu/v1';
export const MINDROUTER_MODEL = 'qwen/qwen3.8-27b';
export const GEMINI_MODEL = 'gemini-3.8-flash';

let apiState = null;

export function initAPI(apiKey) {
  apiState = { apiKey };
}

export function hasAPIKey() {
  return apiState !== null && apiState.apiKey;
}

export function isMindRouterKey(key) {
  return typeof key === 'string' && key.trim().startsWith('mr2_');
}

export function backendName(key) {
  return isMindRouterKey(key) ? 'MindRouter' : 'Google Gemini';
}

/**
 * Send a message to whichever backend the current key selects.
 * @param {string} systemPrompt - The system prompt
 * @param {Array} conversationHistory - Array of {role: 'user'|'model', text: string}
 * @param {string} userMessage - The new user message
 * @returns {Promise<string>} The model's response text
 */
export async function callModel(systemPrompt, conversationHistory, userMessage) {
  if (!apiState) {
    throw new Error('API key not set. Please enter your Gemini API key.');
  }
  return isMindRouterKey(apiState.apiKey)
    ? callMindRouter(systemPrompt, conversationHistory, userMessage)
    : callGemini(systemPrompt, conversationHistory, userMessage);
}

async function callGemini(systemPrompt, conversationHistory, userMessage) {
  const { GoogleGenAI } = await import('https://esm.run/@google/genai');
  const ai = new GoogleGenAI({ apiKey: apiState.apiKey });

  const contents = conversationHistory.map(turn => ({
    role: turn.role,
    parts: [{ text: turn.text }]
  }));
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: contents,
    config: {
      systemInstruction: systemPrompt
    }
  });

  return response.text;
}

async function callMindRouter(systemPrompt, conversationHistory, userMessage) {
  // OpenAI chat format: the history's 'model' role is 'assistant' here.
  const messages = [{ role: 'system', content: systemPrompt }];
  for (const turn of conversationHistory) {
    messages.push({ role: turn.role === 'model' ? 'assistant' : turn.role, content: turn.text });
  }
  messages.push({ role: 'user', content: userMessage });

  let response;
  try {
    response = await fetch(`${MINDROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiState.apiKey}`
      },
      body: JSON.stringify({ model: MINDROUTER_MODEL, messages: messages })
    });
  } catch (e) {
    throw new Error(`Could not reach MindRouter (${e.message}).`);
  }

  if (!response.ok) {
    let detail = '';
    try {
      const err = await response.json();
      detail = err.detail || err.error?.message || err.error || '';
    } catch (_) { /* body was not JSON */ }
    if (response.status === 401) {
      throw new Error('MindRouter rejected the API key. Check it and try again.');
    }
    throw new Error(`MindRouter error ${response.status}${detail ? ': ' + detail : ''}`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error('MindRouter returned no text.');
  }
  // Thinking models sometimes leave their reasoning inline; never show it.
  text = text.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
  return text.trim();
}

/**
 * Load a markdown file from the content directory
 * @param {string} filename - The filename to load
 * @returns {Promise<string>} The file contents
 */
export async function loadContent(filename) {
  const response = await fetch(`content/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${filename}: ${response.status}`);
  }
  return response.text();
}

/**
 * Build the full system prompt by loading template and injecting guidelines
 * @param {string} systemPromptFile - System prompt template filename
 * @param {string} principlesFile - Principles/guidelines filename
 * @param {string} previousPrinciple - Previous principle for direct feedback characters
 * @returns {Promise<string>} The assembled system prompt
 */
export async function buildSystemPrompt(systemPromptFile, principlesFile, previousPrinciple = 'None') {
  const [template, guidelines] = await Promise.all([
    loadContent(systemPromptFile),
    loadContent(principlesFile)
  ]);

  let prompt = template.replace('{{GUIDELINES}}', guidelines);
  prompt = prompt.replace('{{PREVIOUS_PRINCIPLE}}', previousPrinciple);

  return prompt;
}
