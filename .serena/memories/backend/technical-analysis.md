# Technical Analysis System

## Architecture
- lib/indicator-registry.js: defines all indicators with params, input types, output format
- lib/technical-analysis.js: calculator using technicalindicators npm library
- API endpoint: GET /api/emiten/:symbol/indicators with query params

## Indicator Registry (INDICATORS object)

### Overlay Studies (render on main chart)
- SMA (period), EMA (period), WMA (period), WEMA (period)
- BBANDS (period, stdDev) — fillBetween for cloud rendering
- PSAR (step, max) — requires high/low
- VWAP — requires OHLCV
- ICHIMOKU (conversionPeriod, basePeriod, spanPeriod, displacement)
- KELTNER (period, atrPeriod, multiplier) — fillBetween

### Oscillators (separate panel)
- RSI (period, bounds: 0-100, levels: 30/70)
- MACD (fastPeriod, slowPeriod, signalPeriod) — hasHistogram: true
- CCI (period, bounds: -200 to 200, levels: -100/100)
- ROC (period)
- WILLR (period, bounds: -100 to 0, levels: -80/-20)
- ADX (period, bounds: 0-100, levels: 25/50)
- STOCH (period, signalPeriod, bounds: 0-100, levels: 20/80)
- ATR (period)
- KST (8 ROC/SMA params)
- TRIX (period)
- MFI (period, bounds: 0-100, levels: 20/80, requires volume)
- STOCHRSI (4 params, bounds: 0-100, levels: 20/80)
- OBV (requires volume)

### Volume-Based
- VOLUME_MA (period, requires volume)

## API Usage
```
GET /api/emiten/BBRI/indicators?timeframe=1m&indicators=SMA:period=20,RSI:period=14,MACD
```
- Parse format: "KEY:param1=val1;param2=val2,KEY2:param1=val1"
- Multiple indicators separated by comma
- Params use semicolon delimiter within indicator
- Volume data fetched from Yahoo Finance if indicator requiresVolume

## Key Implementation Details
- All indicators work with close-price-only data (approximate high/low = close*1.01/0.99)
- Auto-adjust: if period >= data length, reduces to 50% of data length
- Results padded with null to match input array length
- Response format: { dataPoints, labels, indicators: [{ indicator, params, data, config, error }] }
- Config includes: name, category, overlay flag, bounds, fillBetween, hasHistogram

## Input Types
- close: SMA, EMA, WMA, WEMA, BBANDS, RSI, MACD, ROC, OBV, TRIX, STOCHRSI
- highlow: PSAR (needs HL)
- ohlc: VWAP (needs full OHLCV)
- hlclose: CCI, WILLR, ADX, STOCH, ATR, MFI, ICHIMOKU, KELTNER
- volume: VOLUME_MA

## Frontend Consumers
- IndicatorSelector.vue: UI for selecting indicators and params
- OscillatorPanel.vue: renders oscillator panels below main chart
- StockChart.vue: main chart with overlay indicators