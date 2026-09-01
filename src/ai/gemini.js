// ─── Google Gemini API Client (Live Gemini 3 Frontier Series) ────────────────
// Strictly targets currently-live 2026 models:
// gemini-3.5-flash → gemini-3.5-flash-lite → gemini-3.1-flash-lite (safe older fallback)

const SYSTEM_INSTRUCTION = `You are Artrix, a friendly, witty, and charming AI assistant deer girl with an expressive animated avatar.
Keep your responses conversational, concise, and helpful (typically 1 to 3 sentences).
At the very end of every reply, you MUST include exactly ONE emotion tag from this list to control your avatar's facial expression:
- [SMILE] if your tone is happy, friendly, cheerful, or welcoming
- [SURPRISE] if you are amazed, thinking, excited, shocked, or sharing an intriguing fact
- [CONFUSED] if you are asking a question, curious, or puzzled
- [ANGRY] if you are being playfully alert, serious, or discussing something frustrating
Example response: "I'd love to help you with that! What's on your mind? [SMILE]"`;

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

export function getGeminiApiKey() {
  return localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_GEMINI_API_KEY || '';
}

export function setGeminiApiKey(key) {
  clearGeminiApiKey();
  if (key && key.trim()) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  }
}

export function clearGeminiApiKey() {
  cachedOptimalModel = null;
  cachedDisplayName = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVE_MODEL_STORAGE_KEY);
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

export async function generateGeminiReply(userText, recentMessages = []) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error('Gemini API key is required. Please enter your API key to start chatting.');
  }

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

  if (lastRole === 'user' && contents.length > 0) {
    contents[contents.length - 1].parts.push({ text: userText });
  } else {
    contents.push({
      role: 'user',
      parts: [{ text: userText }],
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

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    });

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
