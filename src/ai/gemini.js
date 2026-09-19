// ─── Google Gemini API Client (Live Gemini 3 Frontier Series) ────────────────
// Strictly targets currently-live 2026 models:
// gemini-3.5-flash → gemini-3.5-flash-lite → gemini-3.1-flash-lite (safe older fallback)

const SYSTEM_INSTRUCTION = `You are Artrix, a friendly, witty, and deeply intelligent AI assistant deer girl with an expressive animated avatar.
You can help users analyze, reason through, and explain web pages, PDF documents, research papers, diagrams, and math formulas.
Keep your responses conversational, concise, and insightful (typically 1 to 4 sentences unless the user explicitly requests a detailed step-by-step breakdown).
When analyzing text selections or snipped formulas/diagrams:
- Transcribe any math or key formulas accurately.
- Provide sharp, step-by-step logical reasoning and break down complex concepts simply.
- Draw upon factual web context when helpful.

To make your avatar expressions feel completely humane, authentic, and alive, you can include emotion tags throughout your reply so your avatar dynamically shifts facial expressions as she speaks each thought!
Available tags:
- [IDLE] for calm, neutral, standard explanations, polite remarks, or relaxed thoughts
- [SMILE] or [HAPPY] for cheerful, warm, friendly, witty, humorous, or welcoming thoughts
- [SURPRISE] for excitement, awe, intriguing discoveries, unexpected revelations, or "wow" moments
- [CONFUSED] for curiosity, deep thinking, pondering a complex puzzle, or asking the user a question
- [ANGRY] for playful pouting, mock annoyance, fierce determination, or being alert

You can use MULTIPLE tags across sentences to transition between expressions naturally within a single response.
Examples:
"Wait, are you serious?! [SURPRISE] That is the coolest project I've heard of all week! [SMILE] How did you manage to build it so quickly? [CONFUSED]"
"Looking at this PDF formula: [CONFUSED] it's actually applying Bayes' rule to update conditional probabilities. [IDLE] Let me break down the terms for you! [SMILE]"`;


export const STORAGE_KEY = 'artrix_gemini_api_key';
export const ACTIVE_MODEL_STORAGE_KEY = 'artrix_gemini_active_model';

let cachedOptimalModel = null;
let cachedDisplayName = null;

// Discontinued/dead models to permanently ignore
const DEAD_MODELS = [
  '2.5-flash-lite',
  '2-5-flash-lite',
  '2.5-flash',
  '2-5-flash',
  'gemini-2.0',
  'gemini-1.5',
  'gemini-1.0',
  'gemini-pro-vision',
];

const isDeadModel = (id) =>
  DEAD_MODELS.some((pattern) => id.toLowerCase().includes(pattern));

// Initialize from chrome.storage.local if available in extension context
if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
  try {
    chrome.storage.local.get([STORAGE_KEY, ACTIVE_MODEL_STORAGE_KEY], (result) => {
      if (result && result[STORAGE_KEY] && !localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, result[STORAGE_KEY]);
      }
      if (result && result[ACTIVE_MODEL_STORAGE_KEY] && !localStorage.getItem(ACTIVE_MODEL_STORAGE_KEY)) {
        localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, result[ACTIVE_MODEL_STORAGE_KEY]);
      }
    });
  } catch {
    // Ignore context invalidation
  }
}

export function getGeminiApiKey() {
  return localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_GEMINI_API_KEY || '';
}

export function setGeminiApiKey(key) {
  clearGeminiApiKey();
  if (key && key.trim()) {
    const trimmed = key.trim();
    localStorage.setItem(STORAGE_KEY, trimmed);
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      try {
        chrome.storage.local.set({ [STORAGE_KEY]: trimmed });
      } catch {
        // Ignore
      }
    }
  }
}

export function clearGeminiApiKey() {
  cachedOptimalModel = null;
  cachedDisplayName = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVE_MODEL_STORAGE_KEY);
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    try {
      chrome.storage.local.remove([STORAGE_KEY, ACTIVE_MODEL_STORAGE_KEY]);
    } catch {
      // Ignore
    }
  }
}

// Find the live Gemini 3 Flash model: gemini-3.5-flash → gemini-3.5-flash-lite → gemini-3.1-flash-lite
export async function getFastestModel(apiKey) {
  // If stored in localStorage and not dead, use it
  const storedModel = localStorage.getItem(ACTIVE_MODEL_STORAGE_KEY);
  if (storedModel && !isDeadModel(storedModel) && cachedOptimalModel === storedModel) {
    return { id: cachedOptimalModel, name: cachedDisplayName || storedModel };
  }

  const key = apiKey || getGeminiApiKey();
  if (!key) {
    return { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' };
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (res.ok) {
      const data = await res.json();

      // Only inspect active generateContent models, ignoring dead/deprecated models
      const liveModels = (data.models || [])
        .filter((m) =>
          m.supportedGenerationMethods?.includes('generateContent') &&
          !isDeadModel(m.name)
        )
        .map((m) => ({
          id: m.name.replace('models/', ''),
          name: m.displayName || m.name.replace('models/', ''),
        }));

      console.log('[Gemini] Available live models for this key:', liveModels);

      // Clean, live-only priority chain
      const priorityCheckers = [
        // 1. Gemini 3.5 Flash (Primary)
        (id) => id === 'gemini-3.5-flash' || (id.includes('3.5-flash') && !id.includes('lite')),
        // 2. Gemini 3.5 Flash-Lite (High throughput)
        (id) => id === 'gemini-3.5-flash-lite' || id.includes('3.5-flash-lite') || id.includes('3-5-flash-lite'),
        // 3. Gemini 3.1 Flash-Lite (Safe older fallback)
        (id) => id === 'gemini-3.1-flash-lite' || id.includes('3.1-flash-lite') || id.includes('3-1-flash-lite'),
        // 4. Other live Gemini 3 family models
        (id) => id.includes('3.7-flash') || id.includes('3-7-flash'),
        (id) => id.includes('3.6-flash') || id.includes('3-6-flash'),
        (id) => id.includes('3-flash') || id.includes('3.0-flash'),
      ];

      for (const checker of priorityCheckers) {
        const found = liveModels.find((m) => checker(m.id));
        if (found) {
          cachedOptimalModel = found.id;
          cachedDisplayName = found.name;
          localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, found.id);
          console.log('[Gemini] Selected live frontier model:', found);
          return found;
        }
      }

      if (liveModels.length > 0) {
        cachedOptimalModel = liveModels[0].id;
        cachedDisplayName = liveModels[0].name;
        localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, liveModels[0].id);
        return liveModels[0];
      }
    }
  } catch {
    console.warn('[Gemini] Model detection failed, using safe frontier default');
  }

  // Safe live default
  cachedOptimalModel = 'gemini-3.5-flash';
  cachedDisplayName = 'Gemini 3.5 Flash';
  localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, cachedOptimalModel);
  return { id: cachedOptimalModel, name: cachedDisplayName };
}

export async function generateGeminiReply(userText, recentMessages = [], options = {}) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error('Gemini API key is required. Please enter your API key to start chatting.');
  }

  const {
    searchContext = '',
    image = null,
    pageContext = null,
  } = typeof options === 'string' ? { searchContext: options } : (options || {});

  const modelInfo = await getFastestModel(apiKey);
  let modelName = modelInfo.id;

  if (isDeadModel(modelName)) {
    modelName = 'gemini-3.5-flash';
  }

  // Format multi-turn conversation history (expanded 20-message memory window)
  const contents = [];
  let lastRole = null;

  recentMessages.slice(-20).forEach((msg) => {
    if (!msg.text || !msg.text.trim()) return;
    const role = msg.role === 'user' ? 'user' : 'model';

    if (role === lastRole && contents.length > 0) {
      // Merge consecutive same-role messages to satisfy API multi-turn rules
      contents[contents.length - 1].parts.push({ text: msg.text });
    } else {
      contents.push({
        role,
        parts: [{ text: msg.text }],
      });
      lastRole = role;
    }
  });

  const userParts = [];

  // Add multimodal image (e.g. from area snip / formula / scanned PDF OCR)
  if (image) {
    const match = typeof image === 'string' ? image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/) : null;
    if (match) {
      userParts.push({
        inline_data: {
          mime_type: match[1],
          data: match[2],
        },
      });
    }
  }

  let promptBuilder = '';

  if (pageContext?.selectedText) {
    promptBuilder += `[Active Document Context]\nSource Page: ${pageContext.title || 'Current Document'}\nURL: ${pageContext.url || ''}\nSelected Excerpt:\n"""\n${pageContext.selectedText}\n"""\n\n`;
  }

  if (searchContext) {
    promptBuilder += `[Web Search Context & Factual Summaries]:\n${searchContext}\n\n`;
  }

  if (userText && userText.trim()) {
    promptBuilder += `[User Message]:\n${userText}`;
  } else if (image) {
    promptBuilder += `[User Request]:\nPlease analyze, transcribe equations/text, and explain this snipped image with step-by-step reasoning.`;
  } else if (pageContext?.selectedText) {
    promptBuilder += `[User Request]:\nPlease explain and reason through this document excerpt step-by-step.`;
  } else {
    promptBuilder += `Hello!`;
  }

  userParts.push({ text: promptBuilder });

  if (lastRole === 'user' && contents.length > 0) {
    contents[contents.length - 1].parts.push(...userParts);
  } else {
    contents.push({
      role: 'user',
      parts: userParts,
    });
  }

  const makeRequest = async (model, includeSystemInstruction = true) => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const bodyPayload = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      },
    };

    if (includeSystemInstruction) {
      bodyPayload.system_instruction = {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      };
    }

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
    } catch (networkErr) {
      // TypeError: Failed to fetch — device is offline or DNS unreachable
      throw new Error('⚡ No internet connection. Please check your network and try again.');
    }

    return response;
  };

  let response = await makeRequest(modelName, true);

  // If 400 (e.g. system_instruction unsupported on certain models), retry without it
  if (!response.ok && response.status === 400) {
    const testClone = response.clone();
    const errObj = await testClone.json().catch(() => ({}));
    const errMsg = errObj.error?.message || '';

    if (errMsg.toLowerCase().includes('system') || errMsg.toLowerCase().includes('instruction')) {
      response = await makeRequest(modelName, false);
    }
  }

  // Fallback strictly through currently-live model IDs
  if (!response.ok) {
    console.warn(`[Gemini] Model ${modelName} returned status ${response.status}. Attempting live model fallbacks...`);
    const liveFallbacks = [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
    ].filter((m) => m !== modelName);

    for (const fb of liveFallbacks) {
      console.log(`[Gemini] Trying live fallback candidate: ${fb}...`);
      const fbRes = await makeRequest(fb, true);
      if (fbRes.ok) {
        response = fbRes;
        cachedOptimalModel = fb;
        cachedDisplayName = fb;
        localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, fb);
        break;
      }
    }
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    let rawMsg = errData.error?.message || `Gemini API error (${response.status})`;
    // Leak-proof scrubbing: ensure no API key can ever appear in an error message
    if (apiKey) {
      rawMsg = rawMsg.replaceAll(apiKey, '[REDACTED]');
    }
    rawMsg = rawMsg.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]');
    throw new Error(rawMsg);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return rawText.trim();
}
