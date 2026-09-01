// ─── Google Gemini API Client (Latest High-Token Flash Models Only) ──────────
// Strictly selects the latest Google Flash models offering the highest token allowances.

const SYSTEM_INSTRUCTION = `You are Artrix, a friendly, witty, and charming AI assistant deer girl with an expressive animated avatar.
Keep your responses conversational, concise, and helpful (typically 1 to 3 sentences).
At the very end of every reply, you MUST include exactly ONE emotion tag from this list to control your avatar's facial expression:
- [SMILE] if your tone is happy, friendly, cheerful, or welcoming
- [SURPRISE] if you are amazed, thinking, excited, shocked, or sharing an intriguing fact
- [CONFUSED] if you are asking a question, curious, or puzzled
- [ANGRY] if you are being playfully alert, serious, or discussing something frustrating
Example response: "I'd love to help you with that! What's on your mind? [SMILE]"`;

export const STORAGE_KEY = 'artrix_gemini_api_key';

let cachedOptimalModel = null;
let cachedDisplayName = null;

export function getGeminiApiKey() {
  return localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_GEMINI_API_KEY || '';
}

export function setGeminiApiKey(key) {
  cachedOptimalModel = null;
  cachedDisplayName = null;
  if (key && key.trim()) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Find the latest Flash model with the highest token limits & fastest throughput
export async function getFastestModel(apiKey) {
  if (cachedOptimalModel) {
    return { id: cachedOptimalModel, name: cachedDisplayName };
  }

  const key = apiKey || getGeminiApiKey();
  if (!key) {
    return { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' };
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (res.ok) {
      const data = await res.json();
      
      // STRICT FILTER: Only consider models containing 'flash' with generateContent support
      const flashModels = (data.models || [])
        .filter((m) =>
          m.supportedGenerationMethods?.includes('generateContent') &&
          m.name.toLowerCase().includes('flash')
        )
        .map((m) => ({
          id: m.name.replace('models/', ''),
          name: m.displayName || m.name.replace('models/', ''),
        }));

      console.log('[Gemini] Flash models available for this key:', flashModels);

      // Priority ranking: Latest versions with highest token allowance first
      const priorityCheckers = [
        // 1. Flash Lite (Highest TPM quota: 4M TPM free tier, 1M context)
        (id) => id.includes('2.5-flash-lite') || id.includes('2-5-flash-lite'),
        (id) => id.includes('2.0-flash-lite') || id.includes('2-0-flash-lite') || id.includes('flash-lite'),
        // 2. Full Flash 2.x (1M context window, high speed)
        (id) => id.includes('2.5-flash') || id.includes('2-5-flash'),
        (id) => id === 'gemini-2.0-flash' || id.includes('2.0-flash'),
        // 3. Flash 1.5 Latest (1M context window)
        (id) => id === 'gemini-1.5-flash-latest',
        (id) => id === 'gemini-1.5-flash',
        (id) => id.includes('1.5-flash-8b'),
        (id) => id.includes('1.5-flash'),
      ];

      for (const checker of priorityCheckers) {
        const found = flashModels.find((m) => checker(m.id));
        if (found) {
          cachedOptimalModel = found.id;
          cachedDisplayName = found.name;
          console.log('[Gemini] High-token Flash model selected:', found);
          return found;
        }
      }

      if (flashModels.length > 0) {
        cachedOptimalModel = flashModels[0].id;
        cachedDisplayName = flashModels[0].name;
        return flashModels[0];
      }
    }
  } catch (err) {
    console.warn('[Gemini] Flash model detection failed, using fallback:', err);
  }

  cachedOptimalModel = 'gemini-2.0-flash-lite';
  cachedDisplayName = 'Gemini 2.0 Flash Lite';
  return { id: cachedOptimalModel, name: cachedDisplayName };
}

export async function generateGeminiReply(userText, recentMessages = []) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error('Gemini API key is required. Please enter your API key to start chatting.');
  }

  const modelInfo = await getFastestModel(apiKey);
  const modelName = modelInfo.id;

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
        maxOutputTokens: 800, // High token output budget
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
    response = await makeRequest(modelName, false);
  }

  // If 404 / unsupported, cascade strictly across Flash models only
  if (!response.ok) {
    console.warn(`[Gemini] Flash model ${modelName} returned status ${response.status}. Trying next Flash candidate...`);
    const flashFallbacks = [
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash-lite-preview-02-05',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
    ].filter((m) => m !== modelName);

    for (const fb of flashFallbacks) {
      console.log(`[Gemini] Trying Flash fallback: ${fb}...`);
      const fbRes = await makeRequest(fb, true);
      if (fbRes.ok) {
        response = fbRes;
        cachedOptimalModel = fb;
        break;
      }
    }
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData.error?.message || `Gemini API error (${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return rawText.trim();
}
