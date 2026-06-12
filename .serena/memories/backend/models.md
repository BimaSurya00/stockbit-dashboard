# Database Models (MongoDB / Mongoose)

## Emiten (Emiten.js)
- Fields: symbol (unique, uppercase), name, sector, industry, lastPrice, change, changePercent, volume, marketCap, chartData (Object), chartUpdatedAt, isActive
- Index: text index on name + sector
- Timestamps: true (auto createdAt, updatedAt)
- Populated by: emitenSeed.js (957 entries) from hardcode-daftar-saham.md, then updated by daily price worker

## ChartPrice (ChartPrice.js)
- Fields: symbol, timeframe (enum: 1d,1w,1m,3m,ytd,1y,3y,5y), prices (array of {date,formatted_date,value,change,percentage}), previous, metadata (Object)
- Unique compound index: (symbol, timeframe)
- Populated by: fetch-daily-prices.js worker, API fetch-chart endpoint

## Snapshot (Snapshot.js)
- Fields: type (enum: trending,top_gainer,top_loser,top_value,ihsg), data (Mixed), createdAt
- TTL index on createdAt (expireAfterSeconds: 3600 — 1 hour)
- Populated by: fetch-snapshots.js worker (every 5 min)

## User (User.js)
- Fields: username (unique, lowercase), password (bcrypt hashed), role (enum: admin/user), isActive
- Pre-save hook: auto-hash password if modified (salt rounds: 12)
- Instance method: comparePassword(candidate)
- Default admin seeded by adminSeed.js on startup: admin / admin123
- Note: local session uses JWT; Users persist in own database

## Config (Config.js)
- Fields: key (unique), value, description
- Used for: stockbit_token (primary token source), other runtime configs
- Acts as key-value store for admin-updatable settings

## News (News.js)
- Fields: streamId (unique), title, content, contentOriginal, titleUrl, createdAt, userId, username, fullname, userAvatar, type, images[], source, sourceLabel, sourceImage, topics[], totalReplies, totalLikes, rawData (Mixed), fetchedAt
- Indexes: streamId, createdAt (desc), topics, source, fetchedAt
- Populated by: fetch-news.js worker

## FinancialReport (FinancialReport.js)
- Fields: kodeEmiten, namaEmiten, reportYear, reportPeriod (TW1/TW2/TW3/Tahunan), reportType (rdf/annual), emitenType (s/o), fileModified, attachments[] ({fileId,fileName,filePath,fileSize,fileType,reportPeriod,reportType,reportYear}), timestamps
- Unique compound index: (kodeEmiten, reportYear, reportPeriod, reportType)
- Populated by: seed-financial-reports-from-idx.js worker, import-idx-json.js worker
- Raw data source: data-scrap/ directory (IDX JSON dumps)

## BrokerSnapshot (BrokerSnapshot.js)
- Fields: date, group (foreign/local/government), buy_value, sell_value, net_value, total_value, total_volume, total_frequency, top_brokers[] ({code,name,net_value,buy_value,sell_value}), createdAt
- Unique compound index: (date, group), also index on date desc
- Populated by: fetch-broker-snapshot.js worker

## WorkerJob (WorkerJob.js)
- Fields: worker (enum: snapshot/price/news, unique), status (idle/running/error), progress ({current,total}), message, lastRun, nextRun, errorMessage, timestamps
- Tracks background worker state for monitoring dashboard