require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const News = require('../models/News');
const WorkerJob = require('../models/WorkerJob');
const { analyzeSentimentBatch } = require('../lib/gemini');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockbit_dashboard';

async function updateStatus(status, message, errorMessage = null) {
  try {
    await WorkerJob.findOneAndUpdate(
      { worker: 'sentiment' },
      {
        worker: 'sentiment',
        status,
        message: message || '',
        errorMessage: errorMessage || undefined,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('[WORKER STATUS] Failed to update:', err.message);
  }
}

async function main() {
  try {
    console.log('[START] Sentiment analyzer worker\n');

    if (!process.env.OPENCODE_GO_API_KEY && !process.env.GEMINI_API_KEY) {
      console.error('[ERROR] Tidak ada LLM API key. Set OPENCODE_GO_API_KEY atau GEMINI_API_KEY di .env.');
      await updateStatus('error', 'LLM API key tidak ditemukan');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log('[DB] Connected to MongoDB\n');

    await updateStatus('running', 'Menganalisis sentimen berita...');

    // Ambil berita yang belum dianalisis sentimennya
    const unanalyzed = await News.find({
      'sentiment.analyzedAt': null,
      title: { $ne: null, $exists: true }
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    console.log(`[INFO] ${unanalyzed.length} berita belum dianalisis`);

    if (unanalyzed.length === 0) {
      console.log('[INFO] Semua berita sudah dianalisis');
      await updateStatus('idle', 'Semua berita sudah dianalisis');
      await mongoose.disconnect();
      return;
    }

    // Proses dalam batch @ 5
    const BATCH_SIZE = 5;
    let analyzed = 0;
    let failed = 0;

    for (let i = 0; i < unanalyzed.length; i += BATCH_SIZE) {
      const batch = unanalyzed.slice(i, i + BATCH_SIZE);
      const newsInput = batch.map(n => ({
        streamId: n.streamId,
        title: n.title,
        content: n.content || n.contentOriginal || '',
        topics: n.topics || []
      }));

      try {
        console.log(`[BATCH] ${i / BATCH_SIZE + 1}/${Math.ceil(unanalyzed.length / BATCH_SIZE)} — ${batch.length} berita`);

        const results = await analyzeSentimentBatch(newsInput);

        for (const r of results) {
          try {
            await News.findOneAndUpdate(
              { streamId: r.streamId },
              {
                'sentiment.score': r.score,
                'sentiment.label': r.label,
                'sentiment.explanation': r.explanation,
                'sentiment.analyzedAt': new Date()
              }
            );
            analyzed++;
          } catch (err) {
            console.error(`[ERROR] Gagal save sentiment untuk ${r.streamId}: ${err.message}`);
            failed++;
          }
        }

        await updateStatus('running', `${analyzed} berita dianalisis, ${failed} gagal`);

        // Delay antar batch
        if (i + BATCH_SIZE < unanalyzed.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (err) {
        console.error(`[BATCH ERROR] ${err.message}`);
        failed += batch.length;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('[SELESAI] Sentiment analysis selesai!');
    console.log('='.repeat(60));
    console.log(`Total dianalisis: ${analyzed}`);
    console.log(`Total gagal: ${failed}`);

    await updateStatus('idle', `${analyzed} berita dianalisis, ${failed} gagal`);
    await mongoose.disconnect();
    console.log('\n[DB] Disconnected');
  } catch (error) {
    console.error('[FATAL ERROR]:', error.message);
    await updateStatus('error', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
