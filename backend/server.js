require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { seedAdmin } = require('./seeds/adminSeed');
const { loadTokenFromDB } = require('./lib/stockbit');

const app = express();
const PORT = process.env.PORT || 3001;

require('./db')();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ─── Mount Routes ───
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/emiten', require('./routes/emiten'));
app.use('/api', require('./routes/chart'));
app.use('/api', require('./routes/market'));
app.use('/api/financial-reports', require('./routes/financial'));
app.use('/api/news', require('./routes/news'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api', require('./routes/misc'));
app.use('/api', require('./routes/system'));
app.use('/api/market-summary', require('./routes/summary'));

// ─── Startup ───
async function startup() {
  await seedAdmin();
  await loadTokenFromDB();
  app.listen(PORT, () => console.log(`Edart Dashboard running on http://localhost:${PORT}`));
}
startup();
