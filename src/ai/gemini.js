// ─── Google Gemini API Client (Latest High-Token Flash Models Only) ──────────
// Strictly selects active Google Flash models, automatically excluding any discontinued versions.

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

// Discontinued/deprecated models to exclude
const DISCONTINUED_PATTERNS = [
  '2.5-flash-lite',
  '2-5-flash-lite',
  'gemini-1.0',
  'gemini-pro-vision',
];

const isDiscontinued = (id) =>
  DISCONTINUED_PATTERNS.some((pattern) => id.toLowerCase().includes(pattern));

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

// Find the latest active Flash model with the highest token limits & fastest throughput
export async function getFastestModel(apiKey) {
  // If stored in localStorage and not discontinued, use it
  const storedModel = localStorage.getItem(ACTIVE_MODEL_STORAGE_KEY);
  if (storedModel && !isDiscontinued(storedModel) && cachedOptimalModel === storedModel) {
    return { id: cachedOptimalModel, name: cachedDisplayName || storedModel };
  }

  const key = apiKey || getGeminiApiKey();
  if (!key) {
    return { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' };
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (res.ok) {
      const data = await res.json();

      // STRICT FILTER: Only active Flash models supporting generateContent, excluding discontinued models
      const flashModels = (data.models || [])
        .filter((m) =>
          m.supportedGenerationMethods?.includes('generateContent') &&
          m.name.toLowerCase().includes('flash') &&
          !isDiscontinued(m.name)
        )
        .map((m) => ({
          id: m.name.replace('models/', ''),
          name: m.displayName || m.name.replace('models/', ''),
        }));

      console.log('[Gemini] Available active Flash models:', flashModels);

      // Priority ranking: Recommended latest versions with highest token allowance first
      const priorityCheckers = [
        // 1. Google's newly recommended 3.5 Flash Lite
        (id) => id.includes('3.5-flash-lite') || id.includes('3-5-flash-lite'),
        (id) => id.includes('3.1-flash-lite') || id.includes('3-1-flash-lite'),
        // 2. Stable Gemini 2.0 Flash Lite (Proven high-speed 4M TPM free tier)
        (id) => id === 'gemini-2.0-flash-lite' || id.includes('2.0-flash-lite') || id.includes('2-0-flash-lite'),
        // 3. Gemini 2.0 Flash
        (id) => id === 'gemini-2.0-flash' || id.includes('2.0-flash') || id.includes('2-0-flash'),
        // 4. Gemini 1.5 Flash (Battle-tested standard)
        (id) => id === 'gemini-1.5-flash-latest',
        (id) => id === 'gemini-1.5-flash',
        (id) => id.includes('1.5-flash-8b'),
        (id) => id.includes('1.5-flash'),
        // 5. Any generic active flash model
        (id) => id.includes('flash-lite'),
        (id) => id.includes('flash'),
      ];

      for (const checker of priorityCheckers) {
        const found = flashModels.find((m) => checker(m.id));
        if (found) {
          cachedOptimalModel = found.id;
          cachedDisplayName = found.name;
          localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, found.id);
          console.log('[Gemini] Optimal active Flash model selected:', found);
          return found;
        }
      }

      if (flashModels.length > 0) {
        cachedOptimalModel = flashModels[0].id;
        cachedDisplayName = flashModels[0].name;
        localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, flashModels[0].id);
        return flashModels[0];
      }
    }
  } catch {
    console.warn('[Gemini] Flash model detection failed, using safe fallback');
  }

  // Safe universal fallback
  cachedOptimalModel = 'gemini-2.0-flash-lite';
  cachedDisplayName = 'Gemini 2.0 Flash Lite';
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

  // If cached model is discontinued, force fallback
  if (isDiscontinued(modelName)) {
    modelName = 'gemini-2.0-flash-lite';
  }

  // Format multi-turn conversation history
  const contents = [];

  recentMessages.slice(-8).forEach((msg) => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    });
  });

  contents.push({
    role: 'user',
    parts: [{ text: userText }],
  });

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

    // If it's specifically a system instruction issue, retry without it
    if (errMsg.toLowerCase().includes('system') || errMsg.toLowerCase().includes('instruction')) {
      response = await makeRequest(modelName, false);
    }
  }

  // If failed (e.g. model no longer available, 404, 403, or invalid version), cascade through active Flash candidates
  if (!response.ok) {
    console.warn(`[Gemini] Model ${modelName} returned status ${response.status}. Attempting active Flash fallbacks...`);
    const flashFallbacks = [
      'gemini-3.5-flash-lite',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash-lite-preview-02-05',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
    ].filter((m) => m !== modelName && !isDiscontinued(m));

    for (const fb of flashFallbacks) {
      console.log(`[Gemini] Trying fallback Flash candidate: ${fb}...`);
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
