const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// ─── Provider Detection ───
const LLM_PROVIDER = (process.env.LLM_PROVIDER || '').toLowerCase();
const USE_OPENCODE = LLM_PROVIDER === 'opencode' || process.env.OPENCODE_GO_API_KEY ? true : false;
const USE_GEMINI = !USE_OPENCODE && process.env.GEMINI_API_KEY ? true : false;

let geminiModel = null;
let openaiClient = null;

function getProvider() {
  if (USE_OPENCODE) return 'opencode';
  if (USE_GEMINI) return 'gemini';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENCODE_GO_API_KEY) return 'opencode';
  throw new Error('Tidak ada LLM API key. Set GEMINI_API_KEY atau OPENCODE_GO_API_KEY di .env');
}

function getGeminiModel() {
  if (geminiModel) return geminiModel;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  geminiModel = genAI.getGenerativeModel({ model: modelName });
  return geminiModel;
}

function getOpenAIClient() {
  if (openaiClient) return openaiClient;
  openaiClient = new OpenAI({
    apiKey: process.env.OPENCODE_GO_API_KEY,
    baseURL: process.env.OPENCODE_GO_BASE_URL || undefined,
  });
  return openaiClient;
}

function getOpenCodeModel() {
  return process.env.OPENCODE_GO_MODEL || 'kimi-k2.6';
}

// ─── Shared: Prompt builders ───

function buildSentimentPrompt(newsItems) {
  const newsBlock = newsItems.map((n, i) => {
    const topicStr = (n.topics || []).filter(t => t.length <= 5).join(', ') || 'saham';
    return `[${i + 1}]
Judul: ${n.title}
Konten: ${(n.content || '').substring(0, 1000)}
Topik: ${topicStr}`;
  }).join('\n\n');

  return `Kamu adalah analis sentimen pasar saham Indonesia. Analisis sentimen dari setiap berita berikut untuk emiten/saham yang disebutkan.

Berita:
${newsBlock}

Untuk setiap berita, berikan response dalam format JSON array:
[
  {
    "index": 1,
    "score": -1.0 sampai 1.0,
    "label": "positif" | "netral" | "negatif",
    "explanation": "Penjelasan singkat (maks 100 karakter)"
  }
]

Pedoman skor:
- 0.5 s/d 1.0 = positif (kabar baik: laba naik, ekspansi, sentimen pasar positif)
- -0.5 s/d -0.1 = negatif (kabar buruk: rugi, kasus hukum, PHK, sentimen pasar negatif)
- -0.1 s/d 0.1 = netral (faktual, tidak ada dampak signifikan, atau berimbang)

Hanya respond dengan JSON array, tanpa teks lain.`;
}

function buildChatSystemPrompt(context) {
  let prompt = `Kamu adalah asisten analis saham Indonesia profesional dengan akses data pasar real-time.
Gunakan bahasa Indonesia yang natural dan mudah dipahami.
Jangan memberikan saran investasi atau rekomendasi beli/jual.
Semua data di bawah ini ADALAH DATA REAL yang tersedia untuk analisis.

KONTEKS DATA SAAT INI:\n`;

  if (context.symbol) {
    prompt += `\nEmiten: ${context.symbol}\n`;

    if (context.technicalIndicators) {
      const ti = context.technicalIndicators;
      console.log('[AI-PROMPT] Ada indikator teknikal:', JSON.stringify(ti));
      prompt += `\nDATA TEKNIKAL REAL-TIME (${context.symbol}):\n`;
      prompt += `- Harga terakhir: ${ti.lastPrice}\n`;
      prompt += `- SMA20: ${ti.sma20} | SMA50: ${ti.sma50} | EMA20: ${ti.ema20}\n`;
      if (ti.sma200 && ti.sma200 !== '-') prompt += `- SMA200: ${ti.sma200}\n`;
      prompt += `- RSI(14): ${ti.rsi14} (>70 overbought, <30 oversold)\n`;
      prompt += `- MACD: ${ti.macd} | Signal: ${ti.macdSignal} | Histogram: ${ti.macdHistogram}\n`;
      prompt += `- Volume: ${ti.volume} (rata2 10 hari: ${ti.avgVolume10})\n`;
      prompt += `WAJIB: Sertakan analisa teknikal menggunakan data di atas dalam jawabanmu.\n`;
    } else {
      prompt += `\nINDIKATOR TEKNIKAL TERSEDIA di halaman Chart dashboard (SMA, EMA, RSI, MACD, Bollinger, dll).\n`;
      prompt += `Jika user tanya analisa teknikal, arahkan ke halaman Chart untuk lihat visual.\n`;
    }
    if (context.priceData) {
      prompt += `Data harga terbaru tersedia — gunakan untuk memberikan insight singkat.\n`;
    }
  }

  if (context.newsItems && context.newsItems.length > 0) {
    prompt += `\nBerita Terkait:\n`;
    context.newsItems.slice(0, 10).forEach((n, i) => {
      prompt += `${i + 1}. [${n.createdDisplay || ''}] ${n.title}`;
      if (n.sentiment?.label) {
        prompt += ` (Sentimen: ${n.sentiment.label})`;
      }
      prompt += '\n';
    });
  }

  if (context.priceData) {
    prompt += `\nData Harga: ${JSON.stringify(context.priceData, null, 2)}\n`;
  }

  if (context.financialReports && context.financialReports.length > 0) {
    prompt += `\nLaporan Keuangan Tersedia: ${context.financialReports.length} laporan\n`;
  }

  if (context.extraContext) {
    prompt += `\n${context.extraContext}\n`;
  }

  return prompt;
}

// ─── Gemini Implementations ───

async function geminiSentimentBatch(newsItems) {
  const m = getGeminiModel();
  const prompt = buildSentimentPrompt(newsItems);

  const result = await m.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
  });

  const text = result.response.text();
  return parseSentimentResponse(text, newsItems);
}

async function geminiChatStream(question, context, onStream) {
  const m = getGeminiModel();
  const systemPrompt = buildChatSystemPrompt(context);

  const chat = m.startChat({
    history: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Siap, saya akan membantu analisis saham dengan data yang tersedia.' }] },
    ],
    generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
  });

  const result = await chat.sendMessageStream(question);
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    if (chunkText && onStream) onStream(chunkText);
  }
}

// ─── OpenCode (OpenAI-compatible) Implementations ───

async function opencodeSentimentBatch(newsItems) {
  const client = getOpenAIClient();
  const prompt = buildSentimentPrompt(newsItems);

  const response = await client.chat.completions.create({
    model: getOpenCodeModel(),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 2048,
  });

  const text = response.choices[0]?.message?.content || '';
  return parseSentimentResponse(text, newsItems);
}

async function opencodeChatStream(question, context, onStream) {
  const client = getOpenAIClient();
  const systemPrompt = buildChatSystemPrompt(context);

  const stream = await client.chat.completions.create({
    model: getOpenCodeModel(),
    messages: [
      { role: 'system', content: 'Kamu adalah asisten analis saham Indonesia.' },
      { role: 'user', content: systemPrompt },
      { role: 'assistant', content: 'Siap, saya akan membantu analisis saham dengan data yang tersedia.' },
      { role: 'user', content: question },
    ],
    temperature: 0.3,
    max_tokens: 4096,
    stream: true,
  });

  for await (const chunk of stream) {
    const chunkText = chunk.choices[0]?.delta?.content || '';
    if (chunkText && onStream) onStream(chunkText);
  }
}

// ─── Shared: Response parser ───

function parseSentimentResponse(text, newsItems) {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('[LLM] Gagal parse response:', text.substring(0, 200));
    return newsItems.map(n => ({ streamId: n.streamId, score: 0, label: 'netral', explanation: 'Gagal menganalisis' }));
  }

  if (!Array.isArray(parsed)) {
    console.error('[LLM] Response bukan array:', JSON.stringify(parsed).substring(0, 200));
    return newsItems.map(n => ({ streamId: n.streamId, score: 0, label: 'netral', explanation: 'Gagal menganalisis' }));
  }

  return parsed.map(p => ({
    streamId: newsItems[p.index - 1]?.streamId || 0,
    score: typeof p.score === 'number' ? Math.max(-1, Math.min(1, p.score)) : 0,
    label: ['positif', 'netral', 'negatif'].includes(p.label) ? p.label : 'netral',
    explanation: p.explanation || ''
  }));
}

// ─── Public API ───

/**
 * Analisis sentimen untuk satu atau lebih berita.
 */
async function analyzeSentimentBatch(newsItems) {
  if (!newsItems || newsItems.length === 0) return [];

  const provider = getProvider();
  console.log(`[LLM] Sentiment batch — ${newsItems.length} items via ${provider}`);

  if (provider === 'opencode') {
    return opencodeSentimentBatch(newsItems);
  }
  return geminiSentimentBatch(newsItems);
}

/**
 * Chat dengan konteks data saham (streaming).
 */
async function chatWithContext(question, context, onStream) {
  const provider = getProvider();
  console.log(`[LLM] Chat — via ${provider}`);

  if (provider === 'opencode') {
    return opencodeChatStream(question, context, onStream);
  }
  return geminiChatStream(question, context, onStream);
}

module.exports = {
  analyzeSentimentBatch,
  chatWithContext,
  getProvider,
};
