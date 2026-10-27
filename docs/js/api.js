// LLM bridge. One key box, four backends, chosen by the key's prefix:
//   - a University of Idaho MindRouter key ("mr2_") goes to MindRouter, an
//     OpenAI-compatible gateway, through the public proxy on the lakehouse VM
//     (MindRouter itself is campus-only, and the proxy adds the CORS headers a
//     page on github.io needs);
//   - an Anthropic key ("sk-ant-") goes to Claude via the @anthropic-ai/sdk
//     loaded from a CDN;
//   - an OpenAI key (any other "sk-") goes to OpenAI's chat completions API;
//   - any other key is treated as a Google Gemini key and goes to Google via the
//     @google/genai SDK loaded from a CDN.
// Routing by prefix avoids test calls that would send a key to a provider it
// does not belong to.

export const MINDROUTER_BASE_URL = 'https://nlayman-external.insight.uidaho.edu/v1';
export const MINDROUTER_MODEL = 'qwen/qwen3.8-27b';
export const OPENAI_BASE_URL = 'https://api.openai.com/v1';
export const OPENAI_MODEL = 'gpt-6-astra';
export const ANTHROPIC_MODEL = 'claude-opus-5-5';
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

// Checked before isOpenAIKey: Anthropic keys also start with "sk-".
export function isAnthropicKey(key) {
  return typeof key === 'string' && key.trim().startsWith('sk-ant-');
}

export function isOpenAIKey(key) {
  return typeof key === 'string' && key.trim().startsWith('sk-') && !isAnthropicKey(key);
}

export function backendName(key) {
  if (isMindRouterKey(key)) return 'MindRouter';
  if (isAnthropicKey(key)) return 'Anthropic Claude';
  if (isOpenAIKey(key)) return 'OpenAI';
  return 'Google Gemini';
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
    throw new Error('API key not set. Please enter your API key.');
  }
  const key = apiState.apiKey;
  if (isMindRouterKey(key)) {
    return callChatCompletions(MINDROUTER_BASE_URL, MINDROUTER_MODEL, 'MindRouter',
      systemPrompt, conversationHistory, userMessage);
  }
  if (isAnthropicKey(key)) {
    return callAnthropic(systemPrompt, conversationHistory, userMessage);
  }
  if (isOpenAIKey(key)) {
    return callChatCompletions(OPENAI_BASE_URL, OPENAI_MODEL, 'OpenAI',
      systemPrompt, conversationHistory, userMessage);
  }
  return callGemini(systemPrompt, conversationHistory, userMessage);
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

async function callAnthropic(systemPrompt, conversationHistory, userMessage) {
  const { default: Anthropic } = await import('https://esm.run/@anthropic-ai/sdk');
  // The visitor's own key lives only in this page, so a browser call is the
  // intended use here rather than a leaked server secret.
  const client = new Anthropic({ apiKey: apiState.apiKey.trim(), dangerouslyAllowBrowser: true });

  // Anthropic roles: the history's 'model' role is 'assistant' here.
  const messages = conversationHistory.map(turn => ({
    role: turn.role === 'model' ? 'assistant' : turn.role,
    content: turn.text
  }));
  messages.push({ role: 'user', content: userMessage });

  let response;
  try {
    response = await client.beta.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 16000,
      system: systemPrompt,
      messages: messages,
      // Conversational coaching does not need deep reasoning; low effort keeps
      // replies quick and the visitor's bill small.
      output_config: { effort: 'low' },
      // On a safety decline, let the API retry on the model it recommends.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default'
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      throw new Error('Anthropic rejected the API key. Check it and try again.');
    }
    if (e instanceof Anthropic.RateLimitError) {
      throw new Error('Anthropic rate limit reached. Wait a minute and try again.');
    }
    if (e instanceof Anthropic.APIConnectionError) {
      throw new Error(`Could not reach Anthropic (${e.message}).`);
    }
    throw new Error(`Anthropic error${e.status ? ' ' + e.status : ''}: ${e.message}`);
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined to answer this request. Try rephrasing it.');
  }
  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');
  if (!text) {
    throw new Error('Anthropic returned no text.');
  }
  return text.trim();
}

// OpenAI chat completions format, shared by OpenAI and MindRouter.
async function callChatCompletions(baseUrl, model, name, systemPrompt, conversationHistory, userMessage) {
  // OpenAI chat format: the history's 'model' role is 'assistant' here.
  const messages = [{ role: 'system', content: systemPrompt }];
  for (const turn of conversationHistory) {
    messages.push({ role: turn.role === 'model' ? 'assistant' : turn.role, content: turn.text });
  }
  messages.push({ role: 'user', content: userMessage });

  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiState.apiKey.trim()}`
      },
      body: JSON.stringify({ model: model, messages: messages })
    });
  } catch (e) {
    throw new Error(`Could not reach ${name} (${e.message}).`);
  }

  if (!response.ok) {
    let detail = '';
    try {
      const err = await response.json();
      detail = err.detail || err.error?.message || err.error || '';
    } catch (_) { /* body was not JSON */ }
    if (response.status === 401) {
      throw new Error(`${name} rejected the API key. Check it and try again.`);
    }
    if (response.status === 429) {
      throw new Error(`${name} rate limit or quota reached${detail ? ': ' + detail : ''}`);
    }
    throw new Error(`${name} error ${response.status}${detail ? ': ' + detail : ''}`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error(`${name} returned no text.`);
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
