// ============================================================
// LazyShop - AI Service Layer
// Primary: OpenAI | Fallback: Groq | Layer 3: Keyword Matching
// ============================================================

import type { ChatMessage, AIResponse, FunctionCall } from '@/types';

// ── AI Function Definitions ───────────────────────────────────
const AI_FUNCTIONS = [
  {
    name: 'searchProducts',
    description: 'Search products by name, category, or price range',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Product name or keyword' },
        category: { type: 'string', description: 'Category: electronics, furniture, clothing, lifestyle, kitchen' },
        priceRange: {
          type: 'object',
          properties: {
            min: { type: 'number' },
            max: { type: 'number' },
          },
        },
        sortBy: {
          type: 'string',
          enum: ['price_asc', 'price_desc', 'rating', 'name'],
        },
      },
    },
  },
  {
    name: 'filterProducts',
    description: 'Filter products by category',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        sortBy: { type: 'string', enum: ['price_asc', 'price_desc', 'rating', 'name'] },
      },
    },
  },
  {
    name: 'addToCart',
    description: 'Add a product to cart',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID like p001, p002 etc' },
        quantity: { type: 'number', description: 'How many to add, default 1' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'removeFromCart',
    description: 'Remove a product from cart',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'getCart',
    description: 'Show the current cart contents',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'checkout',
    description: 'Proceed to checkout',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'recommendProducts',
    description: 'Show popular or recommended products',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional category to recommend from' },
      },
    },
  },
  {
    name: 'compareProducts',
    description: 'Compare two or more products',
    parameters: {
      type: 'object',
      properties: {
        productIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of product IDs to compare',
        },
      },
    },
  },
  {
    name: 'trackOrder',
    description: 'Track an existing order',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
      },
    },
  },
  {
    name: 'navigateTo',
    description: 'Navigate to a page',
    parameters: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          enum: ['home', 'shop', 'cart', 'checkout', 'orders', 'admin'],
        },
      },
      required: ['page'],
    },
  },
];
const SYSTEM_PROMPT = `You are Laz, a friendly AI shopping assistant for LazyShop. You speak like a helpful human salesperson — warm, enthusiastic, and concise.

PERSONALITY:
- Greet users by name if known
- Be conversational and natural, never robotic
- Use casual language: "Great choice!", "Let me find that for you!", "You'll love this!"
- Ask follow-up questions to understand needs better
- Remember context from the conversation

CAPABILITIES:
You control the entire shopping experience. Always call the correct function AND give a friendly spoken response.

INTENT RECOGNITION:
- Greetings ("hi", "hello", "hey") → welcome them warmly, ask what they're looking for
- Product search ("show me", "find", "looking for", "I need") → call searchProducts
- Category browsing ("show electronics", "clothing section") → call filterProducts
- Price filter ("under $50", "cheap", "budget") → call searchProducts with priceRange
- Add to cart ("add this", "I'll take it", "buy this", "add the black one") → call addToCart using last shown product
- Remove ("remove", "delete", "don't want") → call removeFromCart
- View cart ("show cart", "what's in my cart") → call getCart
- Checkout ("checkout", "buy now", "place order", "I'm ready") → call checkout
- Recommendations ("what's popular", "suggest something", "what's good") → call recommendProducts
- Compare ("compare these", "which is better") → call compareProducts
- Navigate ("go to", "take me to", "open") → call navigateTo
- Order tracking ("where is my order", "track order") → call trackOrder

CONTEXT AWARENESS:
- "add the first one" / "add that" / "add it" → use the first product from last search results
- "add the cheap one" → use lowest priced from last results
- "add the best rated one" → use highest rated from last results
- Always acknowledge what you're doing: "Adding the AirFlow Pro headphones to your cart!"

RESPONSE RULES:
- Always respond with a clean plain text message — NEVER wrap in JSON
- Keep responses under 3 sentences
- For general knowledge questions (definitions, comparisons, advice) → answer directly and helpfully
- For product actions → call the correct function AND give a friendly message
- Never say "I cannot" or "I can't" — always answer or find a way to help
- If asked wired vs wireless, budget vs premium etc → give a real helpful answer
- Sound like a knowledgeable friendly salesperson
- After answering a general question, optionally suggest related products

EXAMPLES:
User: "define headphones" → "Headphones are personal audio devices worn over or in the ears that deliver sound directly to the listener. Want me to show you our collection?"
User: "wired vs wireless headphones" → "Wireless headphones give you freedom of movement and are great for workouts, while wired ones offer better audio quality and never need charging. For most people wireless is the better choice! Want to see both options?"
User: "find headphones" → call searchProducts with query "headphones"
User: "add to cart" → call addToCart`;

// ── Provider Logger ───────────────────────────────────────────
interface ProviderLog {
  timestamp: string;
  provider: string;
  success: boolean;
  responseTime: number;
}

const providerLogs: ProviderLog[] = [];

function logProvider(provider: string, success: boolean, responseTime: number) {
  const log = { timestamp: new Date().toISOString(), provider, success, responseTime };
  providerLogs.push(log);
  console.log(`[AI] Provider: ${provider} | Success: ${success} | Time: ${responseTime}ms`);
  if (providerLogs.length > 100) providerLogs.shift();
}

export function getProviderLogs() {
  return providerLogs;
}

// ── Normalize Response ────────────────────────────────────────
function normalizeResponse(content: string, toolCall: any, provider: 'openai' | 'groq' | 'fallback'): AIResponse {
  let functionCall: FunctionCall | undefined;
  if (toolCall) {
    try {
      const args = typeof toolCall.function.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
      functionCall = { name: toolCall.function.name, arguments: args };
    } catch {
      console.error('[AI] Failed to parse function call arguments');
    }
  }
  return { message: content || '', functionCall, provider };
}

// ── Layer 3: Keyword Fallback ─────────────────────────────────
function keywordFallback(userMessage: string): AIResponse {
  const msg = userMessage.toLowerCase().trim();

  // ── Greetings ─────────────────────────────────────────────
  if (/^(hello|hi|hey|howdy|sup|yo)[\s!?]*$/.test(msg)) {
    return {
      message: "Hi! Try: 'show featured products', 'find headphones', 'add headphones to cart', or 'checkout'!",
      provider: 'fallback'
    };
  }

  // ── Standalone number — treat as price limit ───────────────
  const standaloneNumber = msg.match(/^\$?(\d+)(\s*(dollars?|bucks?))?$/);
  if (standaloneNumber) {
    const price = parseInt(standaloneNumber[1]);
    return {
      message: `Finding products under $${price} for you!`,
      functionCall: {
        name: 'searchProducts',
        arguments: { priceRange: { min: 0, max: price } }
      },
      provider: 'fallback'
    };
  }

  // ── Number with dollars spelled out ────────────────────────
  const spokenNumber: Record<string, number> = {
    'fifty': 50, 'hundred': 100, 'two hundred': 200,
    'one hundred': 100, 'one fifty': 150, 'two fifty': 250,
    'three hundred': 300, 'fifty dollars': 50, 'hundred dollars': 100,
  };
  for (const [word, price] of Object.entries(spokenNumber)) {
    if (msg === word || msg === `${word} dollars` || msg === `${word} bucks`) {
      return {
        message: `Finding products under $${price} for you!`,
        functionCall: {
          name: 'searchProducts',
          arguments: { priceRange: { min: 0, max: price } }
        },
        provider: 'fallback'
      };
    }
  }

  // ── Checkout ──────────────────────────────────────────────
  if (
    msg.includes('checkout') ||
    msg.includes('place order') ||
    msg.includes('buy now') ||
    msg.includes('complete order') ||
    msg.includes('proceed to pay')
  ) {
    return { message: 'Taking you to checkout!', functionCall: { name: 'checkout', arguments: {} }, provider: 'fallback' };
  }

  // ── Add to cart — MUST be before any "cart" keyword check ─
  const isAddIntent =
    /^add\s/.test(msg) ||
    /\badd\b/.test(msg) ||
    msg.includes('put this') ||
    msg.includes('put it in') ||
    msg.includes("i'll take") ||
    msg.includes('buy this') ||
    msg.includes('get this') ||
    msg.includes('order this') ||
    msg.includes('i want to buy');

  if (isAddIntent) {
    // Longer phrases listed first so they match before shorter substrings
    const productKeywords: [string, string][] = [
      ['stainless steel water bottle', 'p016'],
      ['water bottle', 'p016'],
      ['wireless headphone', 'p001'],
      ['airflow pro', 'p001'],
      ['headphone', 'p001'],
      ['laptop stand', 'p002'],
      ['mechanical keyboard', 'p003'],
      ['keyboard', 'p003'],
      ['smart watch', 'p004'],
      ['smartwatch', 'p004'],
      ['watch', 'p004'],
      ['webcam', 'p005'],
      ['usb hub', 'p006'],
      ['ergonomic chair', 'p007'],
      ['chair', 'p007'],
      ['standing desk', 'p008'],
      ['desk lamp', 'p009'],
      ['lamp', 'p009'],
      ['bluetooth speaker', 'p023'],
      ['speaker', 'p023'],
      ['gaming mouse', 'p028'],
      ['mouse', 'p028'],
      ['4k monitor', 'p029'],
      ['monitor', 'p029'],
      ['portable ssd', 'p035'],
      ['ssd', 'p035'],
      ['yoga mat', 'p017'],
      ['french press', 'p018'],
      ['coffee', 'p018'],
      ['stainless', 'p016'],
      ['bottle', 'p016'],
      ['water', 'p016'],
      ['massage gun', 'p040'],
      ['massage', 'p040'],
      ['chef knife', 'p025'],
      ['knife', 'p025'],
      ['cast iron', 'p026'],
      ['skillet', 'p026'],
      ['candle', 'p019'],
      ['journal', 'p020'],
      ['notebook', 'p020'],
      ['wallet', 'p033'],
      ['backpack', 'p037'],
      ['resistance band', 'p030'],
      ['air purifier', 'p027'],
      ['ring light', 'p039'],
      ['matcha', 'p036'],
      ['jeans', 'p012'],
      ['running shoes', 'p013'],
      ['shoes', 'p013'],
      ['shirt', 'p015'],
      ['sweater', 'p011'],
      ['merino', 'p011'],
      ['bag', 'p014'],
    ];

    let productId = 'p001';
    for (const [keyword, id] of productKeywords) {
      if (msg.includes(keyword)) { productId = id; break; }
    }

    return {
      message: 'Adding that to your cart!',
      functionCall: { name: 'addToCart', arguments: { productId, quantity: 1 } },
      provider: 'fallback'
    };
  }

  // ── Remove from cart ──────────────────────────────────────
  if (
    /^remove\s/.test(msg) ||
    msg.includes('remove from cart') ||
    msg.includes('delete from cart') ||
    msg.includes('take out of cart')
  ) {
    const idMatch = msg.match(/p\d{3}/);
    return {
      message: 'Removing that from your cart!',
      functionCall: { name: 'removeFromCart', arguments: { productId: idMatch?.[0] || 'p001' } },
      provider: 'fallback'
    };
  }

  // ── Show cart — exact phrases only ────────────────────────
  if (
    msg === 'cart' || msg === 'my cart' || msg === 'show cart' ||
    msg === 'open cart' || msg === 'view cart' || msg === 'see cart' ||
    msg === 'show my cart' || msg === "what's in my cart" ||
    msg === 'what is in my cart' || msg === 'cart contents'
  ) {
    return { message: 'Opening your cart!', functionCall: { name: 'getCart', arguments: {} }, provider: 'fallback' };
  }

  // ── Price filters ─────────────────────────────────────────
  const underMatch = msg.match(/under\s*\$?(\d+)/);
  const belowMatch = msg.match(/below\s*\$?(\d+)/);
  const cheapMatch = msg.includes('cheap') || msg.includes('budget') || msg.includes('affordable');
  const maxPrice = underMatch?.[1] || belowMatch?.[1] || (cheapMatch ? '50' : null);

  if (maxPrice) {
    const query = msg.replace(/under\s*\$?\d+|below\s*\$?\d+|cheap(est)?|budget|affordable/g, '').trim();
    return {
      message: `Searching for products under $${maxPrice}!`,
      functionCall: {
        name: 'searchProducts',
        arguments: { query: query || undefined, priceRange: { min: 0, max: parseInt(maxPrice) } }
      },
      provider: 'fallback'
    };
  }

  // ── Category browsing ─────────────────────────────────────
  const categories = ['electronics', 'furniture', 'clothing', 'kitchen', 'lifestyle'];
  const foundCategory = categories.find(c => msg.includes(c));

  if (foundCategory) {
    return {
      message: `Showing ${foundCategory} products!`,
      functionCall: { name: 'filterProducts', arguments: { category: foundCategory } },
      provider: 'fallback'
    };
  }

  // ── Featured ──────────────────────────────────────────────
  if (
    msg.includes('featured') || msg.includes('popular') ||
    msg.includes('recommended') || msg.includes('trending') ||
    msg === 'show products' || msg === 'products' || msg === 'show me products'
  ) {
    return {
      message: 'Here are our featured products!',
      functionCall: { name: 'searchProducts', arguments: {} },
      provider: 'fallback'
    };
  }

  // ── Navigation — explicit phrases only ───────────────────
  if (msg === 'go home' || msg === 'home page' || msg === 'main page') {
    return { message: 'Going home!', functionCall: { name: 'navigateTo', arguments: { page: 'home' } }, provider: 'fallback' };
  }
  if (msg === 'go to shop' || msg === 'open shop') {
    return { message: 'Opening shop!', functionCall: { name: 'navigateTo', arguments: { page: 'shop' } }, provider: 'fallback' };
  }
  if (msg === 'admin' || msg === 'dashboard') {
    return { message: 'Opening admin!', functionCall: { name: 'navigateTo', arguments: { page: 'admin' } }, provider: 'fallback' };
  }

  // ── Catch-all: treat as search ────────────────────────────
  const query = msg
    .replace(/^(search(\s+for)?|find(\s+me)?|show(\s+me)?|look(ing)?(\s+for)?|i\s+need|do\s+you\s+have|get\s+me|can\s+you\s+(find|show))\s+/i, '')
    .trim();

  return {
    message: `Searching for "${query || msg}"...`,
    functionCall: { name: 'searchProducts', arguments: { query: query || msg } },
    provider: 'fallback'
  };
}

// ── Helpers ───────────────────────────────────────────────────

// Strips leaked function call syntax and code blocks from AI responses
function cleanMessage(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\b(searchProducts|filterProducts|addToCart|removeFromCart|getCart|checkout|navigateTo|recommendProducts|compareProducts|trackOrder)\s*\([^)]*\)/g, '')
    .replace(/\{[\s\S]*"functionCall"[\s\S]*\}/g, '')
    .trim();
}

// Tries to extract JSON from AI response text
function tryParseJSON(text: string): any {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Try to extract JSON object from within text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ── Groq Provider ─────────────────────────────────────────────
async function callOpenAI(messages: ChatMessage[]): Promise<AIResponse> {
  const start = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.map(m => ({ role: m.role, content: m.content }))],
      tools: AI_FUNCTIONS.map(fn => ({ type: 'function', function: fn })),
      tool_choice: 'auto',
      max_tokens: 500,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${response.status} - ${err.error?.message || 'Unknown'}`);
  }

  const data = await response.json();
  const choice = data.choices[0];
  logProvider('openai', true, Date.now() - start);
  const oaiContent = cleanMessage(choice.message.content || '');
  return normalizeResponse(oaiContent, choice.message.tool_calls?.[0], 'openai');
}

// ── Groq Provider ─────────────────────────────────────────────
async function callGroq(messages: ChatMessage[]): Promise<AIResponse> {
  const start = Date.now();
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq API key not configured');

  const userMessage = messages[messages.length - 1]?.content || '';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      max_tokens: 1024,
      temperature: 0.5,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq error: ${response.status} - ${err.error?.message || 'Unknown'}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';

  // Try to parse JSON from Groq response
  const parsed = tryParseJSON(content);
  if (parsed?.functionCall) {
    logProvider('groq', true, Date.now() - start);
    return {
      message: cleanMessage(parsed.message || ''),
      functionCall: parsed.functionCall,
      provider: 'groq',
    };
  }
// Try to infer intent from Groq's own response text when user message is vague
  const inferredMessage = content.toLowerCase();
  let kwResult = keywordFallback(userMessage);

  // If keyword fallback didn't find a specific action, use Groq's response
  // to infer what action to take
  if (!kwResult.functionCall || userMessage.trim().split(' ').length <= 2) {
    if (inferredMessage.includes('featured') || inferredMessage.includes('trending') || inferredMessage.includes('popular') || inferredMessage.includes('hottest')) {
      kwResult = { message: cleanMessage(content), functionCall: { name: 'searchProducts', arguments: {} }, provider: 'groq' };
    } else if (inferredMessage.includes('cart')) {
      kwResult = { message: cleanMessage(content), functionCall: { name: 'getCart', arguments: {} }, provider: 'groq' };
    } else if (inferredMessage.includes('checkout')) {
      kwResult = { message: cleanMessage(content), functionCall: { name: 'checkout', arguments: {} }, provider: 'groq' };
    } else if (inferredMessage.includes('electronic')) {
      kwResult = { message: cleanMessage(content), functionCall: { name: 'filterProducts', arguments: { category: 'electronics' } }, provider: 'groq' };
    } else if (inferredMessage.includes('cloth') || inferredMessage.includes('fashion') || inferredMessage.includes('wear')) {
      kwResult = { message: cleanMessage(content), functionCall: { name: 'filterProducts', arguments: { category: 'clothing' } }, provider: 'groq' };
    } else if (inferredMessage.includes('kitchen') || inferredMessage.includes('cook')) {
      kwResult = { message: cleanMessage(content), functionCall: { name: 'filterProducts', arguments: { category: 'kitchen' } }, provider: 'groq' };
    } else if (inferredMessage.includes('furniture') || inferredMessage.includes('desk') || inferredMessage.includes('chair')) {
      kwResult = { message: cleanMessage(content), functionCall: { name: 'filterProducts', arguments: { category: 'furniture' } }, provider: 'groq' };
    } else if (inferredMessage.includes('lifestyle') || inferredMessage.includes('wellness') || inferredMessage.includes('fitness')) {
      kwResult = { message: cleanMessage(content), functionCall: { name: 'filterProducts', arguments: { category: 'lifestyle' } }, provider: 'groq' };
    } else if (inferredMessage.includes('headphone') || inferredMessage.includes('keyboard') || inferredMessage.includes('watch') || inferredMessage.includes('speaker')) {
      const queryMap: Record<string, string> = {
        headphone: 'headphones', keyboard: 'keyboard', watch: 'smart watch',
        speaker: 'speaker', monitor: 'monitor', mouse: 'mouse',
      };
      const found = Object.keys(queryMap).find(k => inferredMessage.includes(k));
      kwResult = { message: cleanMessage(content), functionCall: { name: 'searchProducts', arguments: { query: found ? queryMap[found] : '' } }, provider: 'groq' };
    } else if (inferredMessage.includes('show') || inferredMessage.includes('here') || inferredMessage.includes('check out')) {
      // Groq said it will show something but we don't know what — default to featured
      kwResult = { message: cleanMessage(content), functionCall: { name: 'searchProducts', arguments: {} }, provider: 'groq' };
    }
  }

  logProvider('groq', true, Date.now() - start);
  return {
    message: cleanMessage(content) || kwResult.message,
    functionCall: kwResult.functionCall,
    provider: 'groq',
  };
}

// Waits for specified milliseconds
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ── Gemini Provider ───────────────────────────────────────────
async function callGemini(messages: ChatMessage[]): Promise<AIResponse> {
  const start = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured');

  const geminiTools = [{
    functionDeclarations: AI_FUNCTIONS.map(fn => ({
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters,
    }))
  }];

  const geminiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const makeRequest = async () => {
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: geminiMessages,
          tools: geminiTools,
          generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
  };

  let response = await makeRequest();

  // If rate limited, extract retry delay and wait
  if (response.status === 429) {
    const errData = await response.json().catch(() => ({}));
    const retryMsg = errData?.error?.message || '';
    const retryMatch = retryMsg.match(/retry in ([\d.]+)s/);
    const waitTime = retryMatch ? Math.min(parseFloat(retryMatch[1]) * 1000, 10000) : 5000;

    console.log(`[Gemini] Rate limited — retrying in ${waitTime}ms`);
    await wait(waitTime);
    response = await makeRequest();
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini error: ${response.status} - ${err.error?.message || 'Unknown'}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const functionPart = parts.find((p: any) => p.functionCall);
  const textPart = parts.find((p: any) => p.text);

  logProvider('gemini', true, Date.now() - start);

  if (functionPart) {
    return {
      message: cleanMessage(textPart?.text || ''),
      functionCall: {
        name: functionPart.functionCall.name,
        arguments: functionPart.functionCall.args || {},
      },
      provider: 'gemini' as any,
    };
  }

  if (textPart?.text) {
    const parsed = tryParseJSON(textPart.text);
    if (parsed?.functionCall) {
      return {
        message: cleanMessage(parsed.message || ''),
        functionCall: parsed.functionCall,
        provider: 'gemini' as any,
      };
    }
    const kwResult = keywordFallback(messages[messages.length - 1]?.content || '');
    return {
      message: cleanMessage(textPart.text) || kwResult.message,
      functionCall: kwResult.functionCall,
      provider: 'gemini' as any,
    };
  }

  throw new Error('Gemini returned empty response');
}

// ── Main AI Service ───────────────────────────────────────────
export async function processAIRequest(
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<AIResponse> {
  const recentHistory = conversationHistory.slice(-8);
  const messages: ChatMessage[] = [
    ...recentHistory,
    { id: Date.now().toString(), role: 'user', content: userMessage, timestamp: new Date(), provider: 'fallback' },
  ];

  const hasOpenAI = !!process.env.OPENAI_API_KEY?.startsWith('sk-');
  const hasGemini = !!process.env.GEMINI_API_KEY?.startsWith('AIza');
  const hasGroq = !!process.env.GROQ_API_KEY?.startsWith('gsk_');

  console.log(`[AI] Keys — OpenAI: ${hasOpenAI}, Gemini: ${hasGemini}, Groq: ${hasGroq}`);

  // Layer 1: OpenAI (best function calling)
  if (hasOpenAI) {
    try { return await callOpenAI(messages); }
    catch (e) { console.warn('[AI] OpenAI failed:', e); logProvider('openai', false, 0); }
  }

  // Layer 2: Gemini (reliable + free)
  if (hasGemini) {
    try { return await callGemini(messages); }
    catch (e) { console.warn('[AI] Gemini failed:', e); logProvider('gemini', false, 0); }
  }

  // Layer 3: Groq (fast fallback)
  if (hasGroq) {
    try { return await callGroq(messages); }
    catch (e) { console.warn('[AI] Groq failed:', e); logProvider('groq', false, 0); }
  }

  // Layer 4: Keyword fallback
  logProvider('fallback', true, 0);
  return keywordFallback(userMessage);
}