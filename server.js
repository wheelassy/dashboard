"use strict";

// ======================================================
// ROYAL ENFIELD - WHEEL DISPATCH & COVERAGE DASHBOARD
// Backend: Node.js + Express + Google Sheets API (Read-Only)
// ======================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const { google } = require("googleapis");

// ======================================================
// 1. CONFIGURATION
// ======================================================

const app = express();

const CONFIG = {
  port: Number(process.env.PORT) || 4000,
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
  credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./credentials/service-account.json",
  defaultTabYear: Number(process.env.DEFAULT_TAB_YEAR) || 2026,
  cacheDuration: 15 * 1000, // 15 seconds
  dataRange: process.env.DAILY_DATA_RANGE || "A1:BN250",
  environment: process.env.NODE_ENV || "development",
  frontendOrigin: process.env.FRONTEND_ORIGIN
};

if (!CONFIG.spreadsheetId) {
  throw new Error("Missing GOOGLE_SPREADSHEET_ID in .env");
}

if (!CONFIG.credentialsPath) {
  throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS in .env");
}

const credentialsPath = path.resolve(process.cwd(), CONFIG.credentialsPath);

// ======================================================
// 2. MIDDLEWARE
// ======================================================

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

// CORS configuration
const allowedOrigins = CONFIG.frontendOrigin
  ? CONFIG.frontendOrigin.split(",").map(x => x.trim())
  : [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://127.0.0.1:5173"
  ];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS"));
  }
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// Request ID and logging
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  const startTime = Date.now();

  res.on("finish", () => {
    console.log(JSON.stringify({
      level: "info",
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startTime
    }));
  });

  next();
});

// ======================================================
// 3. GOOGLE SHEETS API CLIENT (READ-ONLY)
// ======================================================

const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

const sheets = google.sheets({
  version: "v4",
  auth
});

// ======================================================
// 4. IN-MEMORY CACHE
// ======================================================

const cache = new Map();

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data, ttl = CONFIG.cacheDuration) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl
  });
}

function clearCache() {
  cache.clear();
}

// ======================================================
// 5. DAILY TAB PARSING & DETECTION
// ======================================================

const EXCLUDED_TABS = ["FORMAT", "WHEEL MODEL", "MAIL LIST", "LOG HISTORY"];

function parseDailyTab(tabName) {
  if (!tabName) return null;
  const trimmed = String(tabName).trim();

  // Exclude known non-daily tabs
  for (const excluded of EXCLUDED_TABS) {
    if (trimmed.toUpperCase().includes(excluded)) return null;
  }
  if (trimmed.toLowerCase().startsWith("copy of")) return null;

  const match = trimmed.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2}|\d{4}))?$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = match[3] ? Number(match[3]) : CONFIG.defaultTabYear;
  if (year < 100) year += 2000;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    name: trimmed,
    day,
    month,
    year,
    date: date.toISOString().slice(0, 10),
    timestamp: date.getTime()
  };
}

function getSortedDailyTabs(tabs) {
  return tabs
    .map(parseDailyTab)
    .filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp);
}

function getLatestDailyTab(tabs) {
  const sorted = getSortedDailyTabs(tabs);
  return sorted.length > 0 ? sorted[0] : null;
}

// ======================================================
// 6. GOOGLE SHEETS FETCH HELPERS
// ======================================================

async function getSpreadsheetInfo() {
  const cacheKey = "spreadsheet-info";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const response = await sheets.spreadsheets.get({
    spreadsheetId: CONFIG.spreadsheetId,
    fields: "properties.title,sheets.properties.title"
  });

  const result = {
    spreadsheet: response.data.properties.title,
    tabs: response.data.sheets.map(s => s.properties.title)
  };

  setCache(cacheKey, result);
  return result;
}

async function readDailyTab(tabName) {
  const range = `'${tabName.replace(/'/g, "''")}'!${CONFIG.dataRange}`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.spreadsheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING"
  });

  return response.data.values || [];
}

// ======================================================
// 7. DATA PARSING & BUSINESS RULES
// ======================================================

function parseNumber(val) {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

function cleanString(val) {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

function parsePlantSection(rows, plantName, startIdx, endIdx) {
  if (startIdx === -1 || !rows[startIdx]) {
    return {
      items: [],
      supplierCols: [],
      summary: { totalParts: 0, plan: 0, coverage: 0, totalStock: 0, totalReceipt: 0, shortageQty: 0, surplusQty: 0, gap: 0 },
      warnings: [`${plantName} section not found in sheet`]
    };
  }

  const headerRow = rows[startIdx];
  const warnings = [];
  const colMap = {};

  headerRow.forEach((cell, idx) => {
    const txt = cleanString(cell).toUpperCase();
    if (txt === "S.NO" || txt === "SNO") colMap.sNo = idx;
    else if (txt === "PART NO" || txt === "PART NUMBER" || txt === "PART_NO") colMap.partNo = idx;
    else if (txt === "DESCRIPTION" || txt === "DESC") colMap.desc = idx;
    else if (txt === "MODEL" && colMap.model === undefined) colMap.model = idx;
    else if (txt === "TOTAL QTY" || txt === "TOTAL STOCK" || txt === "TOTAL_QTY") colMap.totalQty = idx;
    else if (txt === "BUFFER STOCK" || txt === "BUFFER") colMap.buffer = idx;
    else if (txt === "PLAN") colMap.plan = idx;
    else if (txt === "TOTAL RECEIPT QTY" || txt === "RECEIPT QTY" || txt === "RECEIPT") colMap.receipt = idx;
    else if (txt === "COVERAGE") colMap.coverage = idx;
    else if (txt === "GAP") colMap.gap = idx;
  });

  if (colMap.partNo === undefined) {
    warnings.push(`Could not determine PART NO column for ${plantName}; falling back to col 2`);
    colMap.partNo = 2;
  }
  if (colMap.desc === undefined) colMap.desc = 3;
  if (colMap.model === undefined) colMap.model = 4;
  if (colMap.plan === undefined) colMap.plan = 10;
  if (colMap.coverage === undefined) colMap.coverage = 12;

  // Detect supplier stock columns dynamically between MODEL and TOTAL QTY
  const modelIdx = colMap.model !== undefined ? colMap.model : 4;
  const totalQtyIdx = colMap.totalQty !== undefined ? colMap.totalQty : (colMap.plan !== undefined ? colMap.plan : 8);
  const supplierCols = [];

  for (let c = modelIdx + 1; c < totalQtyIdx; c++) {
    const colName = cleanString(headerRow[c]);
    if (
      colName &&
      !["S.NO", "PART NO", "DESCRIPTION", "MODEL", "TOTAL QTY", "BUFFER STOCK", "PLAN"].includes(colName.toUpperCase())
    ) {
      supplierCols.push({ index: c, name: colName });
    }
  }

  const items = [];
  for (let r = startIdx + 1; r < endIdx; r++) {
    const row = rows[r];
    if (!row) continue;

    const partNo = cleanString(row[colMap.partNo]);
    // Skip empty cells, header repeats, total summaries, contact phone numbers
    if (
      !partNo ||
      partNo.toUpperCase() === "TOTAL" ||
      partNo.toUpperCase() === "PART NO" ||
      /^\d{10}$/.test(partNo) ||
      partNo.length < 3
    ) {
      continue;
    }

    const desc = cleanString(row[colMap.desc]);
    const model = cleanString(row[colMap.model]);
    const plan = parseNumber(row[colMap.plan]);
    const totalReceipt = parseNumber(row[colMap.receipt]);
    const coverage = parseNumber(row[colMap.coverage]);

    // Gap: use source gap if present, or calculate coverage - plan
    const gap = (colMap.gap !== undefined && row[colMap.gap] !== undefined && row[colMap.gap] !== "")
      ? parseNumber(row[colMap.gap])
      : (coverage - plan);

    // Supplier stocks
    const supplierStock = {};
    let calcStock = 0;
    supplierCols.forEach(sc => {
      const sVal = parseNumber(row[sc.index]);
      supplierStock[sc.name] = sVal;
      calcStock += sVal;
    });

    const totalStock = (colMap.totalQty !== undefined && row[colMap.totalQty] !== undefined && row[colMap.totalQty] !== "")
      ? parseNumber(row[colMap.totalQty])
      : calcStock;

    let status = "Balanced";
    if (gap < 0) status = "Shortage";
    else if (gap > 0) status = "Surplus";

    items.push({
      plant: plantName,
      sNo: row[colMap.sNo] !== undefined && row[colMap.sNo] !== "" ? row[colMap.sNo] : items.length + 1,
      partNo,
      description: desc,
      model,
      supplierStock,
      totalStock,
      plan,
      totalReceipt,
      coverage,
      gap,
      status
    });
  }

  const summary = {
    totalParts: items.length,
    plan: items.reduce((s, i) => s + i.plan, 0),
    coverage: items.reduce((s, i) => s + i.coverage, 0),
    totalStock: items.reduce((s, i) => s + i.totalStock, 0),
    totalReceipt: items.reduce((s, i) => s + i.totalReceipt, 0),
    shortageQty: items.reduce((s, i) => i.gap < 0 ? s + Math.abs(i.gap) : s, 0),
    surplusQty: items.reduce((s, i) => i.gap > 0 ? s + i.gap : s, 0),
    gap: items.reduce((s, i) => s + i.gap, 0)
  };

  return { items, supplierCols: supplierCols.map(s => s.name), colMap, summary, warnings };
}

function parseSupplierSection(rows, startIdx, endIdx) {
  if (startIdx === -1 || !rows[startIdx]) {
    return {
      items: [],
      supplierNames: [],
      bySupplier: {},
      summary: { totalOpening: 0, totalDispatch: 0, totalInwarded: 0, totalStock: 0, totalOutstandingBalance: 0 },
      warnings: ["Supplier dispatch section not detected in tab"]
    };
  }

  const headerRow = rows[startIdx];
  const colMap = {};
  headerRow.forEach((cell, idx) => {
    const txt = cleanString(cell).toUpperCase();
    if (txt === "SUPPLIER") colMap.supplier = idx;
    else if (txt === "MODEL") colMap.model = idx;
    else if (txt === "PART NO" || txt === "PART NUMBER") colMap.partNo = idx;
    else if (txt === "OPENING") colMap.opening = idx;
    else if (txt === "DISPATCH") colMap.dispatch = idx;
    else if (txt === "INWARDED") colMap.inwarded = idx;
    else if (txt === "TOTAL") colMap.total = idx;
    else if (txt === "OB" || txt === "OUTSTANDING BALANCE") colMap.ob = idx;
  });

  const items = [];
  let currentSupplier = "";

  for (let r = startIdx + 1; r < endIdx; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawSupplier = cleanString(row[colMap.supplier]);
    const rawPartNo = cleanString(row[colMap.partNo]);
    const rawModel = cleanString(row[colMap.model]);

    // Section boundary check
    if (rawSupplier.toUpperCase() === "SUPPLIER" || rawModel.toUpperCase() === "SUPPLIER") {
      break;
    }

    if (rawSupplier) {
      currentSupplier = rawSupplier;
    }

    if (!rawPartNo || rawPartNo.toUpperCase() === "TOTAL" || rawPartNo.length < 3) {
      continue;
    }

    const opening = parseNumber(row[colMap.opening]);
    const dispatch = parseNumber(row[colMap.dispatch]);
    const inwarded = parseNumber(row[colMap.inwarded]);
    const total = parseNumber(row[colMap.total]);
    const ob = parseNumber(row[colMap.ob]);

    items.push({
      supplier: currentSupplier || "UNKNOWN",
      model: rawModel,
      partNo: rawPartNo,
      opening,
      dispatch,
      inwarded,
      total,
      outstandingBalance: ob
    });
  }

  const supplierNames = [...new Set(items.map(i => i.supplier))];
  const bySupplier = {};

  supplierNames.forEach(name => {
    const sItems = items.filter(i => i.supplier === name);
    bySupplier[name] = {
      name,
      items: sItems,
      opening: sItems.reduce((s, i) => s + i.opening, 0),
      dispatch: sItems.reduce((s, i) => s + i.dispatch, 0),
      inwarded: sItems.reduce((s, i) => s + i.inwarded, 0),
      total: sItems.reduce((s, i) => s + i.total, 0),
      outstandingBalance: sItems.reduce((s, i) => s + i.outstandingBalance, 0)
    };
  });

  const summary = {
    totalOpening: items.reduce((s, i) => s + i.opening, 0),
    totalDispatch: items.reduce((s, i) => s + i.dispatch, 0),
    totalInwarded: items.reduce((s, i) => s + i.inwarded, 0),
    totalStock: items.reduce((s, i) => s + i.total, 0),
    totalOutstandingBalance: items.reduce((s, i) => s + i.outstandingBalance, 0)
  };

  return { items, supplierNames, bySupplier, summary, colMap, warnings: [] };
}

// Generate historical trend across recent daily tabs
async function getHistoricalTrend(dailyTabs, currentTabName) {
  const cacheKey = "historical-trend";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  // Take up to 7 recent daily tabs in chronological order
  const tabsToFetch = dailyTabs.slice(0, 7).reverse();

  const trendData = await Promise.all(
    tabsToFetch.map(async tab => {
      try {
        const rows = await readDailyTab(tab.name);
        if (!rows || rows.length === 0) return null;

        const vallamIdx = rows.findIndex(r => r.some(c => typeof c === "string" && c.toUpperCase().includes("VALLAM")));
        const oragadamIdx = rows.findIndex(r => r.some(c => typeof c === "string" && c.toUpperCase().includes("ORAGADAM")));
        const supplierIdx = rows.findIndex(r => r.some(c => typeof c === "string" && c.toUpperCase().includes("SUPPLIER") && r.some(x => typeof x === "string" && x.toUpperCase().includes("DISPATCH"))));

        const vallam = parsePlantSection(rows, "VALLAM", vallamIdx, oragadamIdx > -1 ? oragadamIdx : rows.length);
        const oragadam = parsePlantSection(rows, "ORAGADAM", oragadamIdx, supplierIdx > -1 ? supplierIdx : rows.length);
        const suppliers = parseSupplierSection(rows, supplierIdx, rows.length);

        return {
          tab: tab.name,
          date: tab.date,
          day: tab.name.slice(0, 5),
          plan: vallam.summary.plan + oragadam.summary.plan,
          coverage: vallam.summary.coverage + oragadam.summary.coverage,
          stock: vallam.summary.totalStock + oragadam.summary.totalStock,
          receipt: vallam.summary.totalReceipt + oragadam.summary.totalReceipt,
          dispatch: suppliers.summary.totalDispatch,
          inwarded: suppliers.summary.totalInwarded
        };
      } catch (err) {
        return null;
      }
    })
  );

  const filteredTrend = trendData.filter(Boolean);
  setCache(cacheKey, filteredTrend, 60 * 1000); // 60s cache for trend
  return filteredTrend;
}

// ======================================================
// 8. API ENDPOINTS
// ======================================================

// GET /api/health
app.get("/api/health", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    success: true,
    application: "Royal Enfield Wheel Dispatch Dashboard",
    status: "running",
    environment: CONFIG.environment,
    serverTime: new Date().toISOString(),
    requestId: req.requestId
  });
});

// GET /api/sheets
app.get("/api/sheets", async (req, res, next) => {
  try {
    const info = await getSpreadsheetInfo();
    const latest = getLatestDailyTab(info.tabs);
    const dailyTabs = getSortedDailyTabs(info.tabs);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      success: true,
      spreadsheet: info.spreadsheet,
      totalTabs: info.tabs.length,
      totalDailyTabs: dailyTabs.length,
      latestDailyTab: latest ? latest.name : null,
      latestDate: latest ? latest.date : null,
      dailyTabs,
      tabs: info.tabs,
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/daily-data
app.get("/api/daily-data", async (req, res, next) => {
  try {
    const info = await getSpreadsheetInfo();
    const latest = getLatestDailyTab(info.tabs);

    if (!latest) {
      return res.status(404).json({
        success: false,
        message: "No valid daily date tab found",
        requestId: req.requestId
      });
    }

    const cacheKey = `daily-data:${latest.name}`;
    let data = getCache(cacheKey);
    let cached = true;

    if (!data) {
      data = await readDailyTab(latest.name);
      setCache(cacheKey, data);
      cached = false;
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({
      success: true,
      spreadsheet: info.spreadsheet,
      selectedTab: latest.name,
      selectedDate: latest.date,
      rowCount: data.length,
      columnCount: data.reduce((max, row) => Math.max(max, row.length), 0),
      cached,
      data,
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/daily-data-by-date?date=30.10.2026
app.get("/api/daily-data-by-date", async (req, res, next) => {
  try {
    const requestedDate = req.query.date;
    if (typeof requestedDate !== "string" || !parseDailyTab(requestedDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date. Use DD.MM.YYYY, DD.MM.YY or DD.MM",
        requestId: req.requestId
      });
    }

    const info = await getSpreadsheetInfo();
    const actualTab = info.tabs.find(tab => tab === requestedDate);

    if (!actualTab) {
      return res.status(404).json({
        success: false,
        message: "Requested daily tab does not exist",
        requestedDate,
        requestId: req.requestId
      });
    }

    const cacheKey = `daily-data:${actualTab}`;
    let data = getCache(cacheKey);
    let cached = true;

    if (!data) {
      data = await readDailyTab(actualTab);
      setCache(cacheKey, data);
      cached = false;
    }

    const parsedDate = parseDailyTab(actualTab);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      success: true,
      spreadsheet: info.spreadsheet,
      selectedTab: actualTab,
      selectedDate: parsedDate.date,
      rowCount: data.length,
      cached,
      data,
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard
// Optional query: ?date=30.10.2026
app.get("/api/dashboard", async (req, res, next) => {
  try {
    const info = await getSpreadsheetInfo();
    const dailyTabs = getSortedDailyTabs(info.tabs);
    const latest = dailyTabs.length > 0 ? dailyTabs[0] : null;

    let targetTabName = req.query.date ? String(req.query.date).trim() : (latest ? latest.name : null);
    if (!targetTabName) {
      return res.status(404).json({
        success: false,
        message: "No daily tab available",
        requestId: req.requestId
      });
    }

    // Verify target tab exists
    const matchingTab = info.tabs.find(t => t.toLowerCase() === targetTabName.toLowerCase());
    if (!matchingTab) {
      return res.status(404).json({
        success: false,
        message: `Daily tab '${targetTabName}' not found in workbook`,
        availableTabs: dailyTabs.map(t => t.name),
        requestId: req.requestId
      });
    }
    targetTabName = matchingTab;

    const cacheKey = `dashboard:${targetTabName}`;
    const cachedResponse = getCache(cacheKey);
    if (cachedResponse) {
      res.setHeader("Cache-Control", "no-store");
      return res.json({
        ...cachedResponse,
        cached: true,
        requestId: req.requestId
      });
    }

    const rows = await readDailyTab(targetTabName);

    // Section indices
    const vallamIdx = rows.findIndex(r => r.some(c => typeof c === "string" && c.toUpperCase().includes("VALLAM")));
    const oragadamIdx = rows.findIndex(r => r.some(c => typeof c === "string" && c.toUpperCase().includes("ORAGADAM")));
    const supplierIdx = rows.findIndex(r => r.some(c => typeof c === "string" && c.toUpperCase().includes("SUPPLIER") && r.some(x => typeof x === "string" && x.toUpperCase().includes("DISPATCH"))));

    const vallamEnd = oragadamIdx > -1 ? oragadamIdx : rows.length;
    const oragadamEnd = supplierIdx > -1 ? supplierIdx : rows.length;
    const supplierEnd = rows.length;

    const vallam = parsePlantSection(rows, "VALLAM", vallamIdx, vallamEnd);
    const oragadam = parsePlantSection(rows, "ORAGADAM", oragadamIdx, oragadamEnd);
    const suppliers = parseSupplierSection(rows, supplierIdx, supplierEnd);

    const allParts = [...vallam.items, ...oragadam.items];

    // Compute main KPIs
    const totalPlan = allParts.reduce((sum, p) => sum + p.plan, 0);
    const totalCoverage = allParts.reduce((sum, p) => sum + p.coverage, 0);
    const totalStock = allParts.reduce((sum, p) => sum + p.totalStock, 0);
    const totalReceipt = allParts.reduce((sum, p) => sum + p.totalReceipt, 0);
    const shortageQty = allParts.reduce((sum, p) => p.gap < 0 ? sum + Math.abs(p.gap) : sum, 0);
    const surplusQty = allParts.reduce((sum, p) => p.gap > 0 ? sum + p.gap : sum, 0);
    const totalDispatch = suppliers.summary.totalDispatch;
    const totalInwarded = suppliers.summary.totalInwarded;

    const shortageItemCount = allParts.filter(p => p.status === "Shortage").length;
    const surplusItemCount = allParts.filter(p => p.status === "Surplus").length;
    const balancedItemCount = allParts.filter(p => p.status === "Balanced").length;

    // Charts:
    // 1. Plant comparison
    const plantComparison = [
      {
        plant: "VALLAM",
        plan: vallam.summary.plan,
        coverage: vallam.summary.coverage,
        stock: vallam.summary.totalStock,
        receipt: vallam.summary.totalReceipt,
        shortageQty: vallam.summary.shortageQty,
        surplusQty: vallam.summary.surplusQty,
        gap: vallam.summary.gap
      },
      {
        plant: "ORAGADAM",
        plan: oragadam.summary.plan,
        coverage: oragadam.summary.coverage,
        stock: oragadam.summary.totalStock,
        receipt: oragadam.summary.totalReceipt,
        shortageQty: oragadam.summary.shortageQty,
        surplusQty: oragadam.summary.surplusQty,
        gap: oragadam.summary.gap
      }
    ];

    // 2. Stock comparison
    const stockComparison = [
      { name: "VALLAM Stock", stock: vallam.summary.totalStock, receipt: vallam.summary.totalReceipt },
      { name: "ORAGADAM Stock", stock: oragadam.summary.totalStock, receipt: oragadam.summary.totalReceipt }
    ];

    // 3. Supplier dispatch vs inwarded
    const supplierPerformance = suppliers.supplierNames.map(name => {
      const data = suppliers.bySupplier[name];
      return {
        supplier: name,
        dispatch: data ? data.dispatch : 0,
        inwarded: data ? data.inwarded : 0,
        opening: data ? data.opening : 0,
        total: data ? data.total : 0,
        outstandingBalance: data ? data.outstandingBalance : 0
      };
    });

    // 4. Shortage vs Surplus
    const statusDistribution = [
      { name: "Shortage", value: shortageItemCount, qty: shortageQty, color: "#ef4444" },
      { name: "Surplus", value: surplusItemCount, qty: surplusQty, color: "#10b981" },
      { name: "Balanced", value: balancedItemCount, qty: 0, color: "#6b7280" }
    ];

    // 5. Wheel Model-wise Plan and Coverage
    const modelAgg = {};
    allParts.forEach(p => {
      const m = p.model || "Unknown";
      if (!modelAgg[m]) modelAgg[m] = { model: m, plan: 0, coverage: 0, stock: 0 };
      modelAgg[m].plan += p.plan;
      modelAgg[m].coverage += p.coverage;
      modelAgg[m].stock += p.totalStock;
    });
    const modelCoverage = Object.values(modelAgg)
      .filter(m => m.plan > 0 || m.coverage > 0)
      .sort((a, b) => b.plan - a.plan)
      .slice(0, 10);

    // 6. Historical trend across recent tabs
    const dailyTrend = await getHistoricalTrend(dailyTabs, targetTabName);

    const parsedTabMeta = parseDailyTab(targetTabName);

    const payload = {
      success: true,
      spreadsheet: info.spreadsheet,
      selectedTab: targetTabName,
      selectedDate: parsedTabMeta ? parsedTabMeta.date : targetTabName,
      latestDailyTab: latest ? latest.name : null,
      availableTabs: dailyTabs,
      lastRefreshed: new Date().toISOString(),
      kpis: {
        totalPlan,
        availableCoverage: totalCoverage,
        totalStock,
        totalReceipt,
        shortageQty,
        surplusQty,
        totalDispatch,
        totalInwarded,
        netGap: totalCoverage - totalPlan,
        shortageItemCount,
        surplusItemCount,
        balancedItemCount,
        totalPartsCount: allParts.length
      },
      plants: {
        VALLAM: {
          summary: vallam.summary,
          supplierColumns: vallam.supplierCols,
          items: vallam.items
        },
        ORAGADAM: {
          summary: oragadam.summary,
          supplierColumns: oragadam.supplierCols,
          items: oragadam.items
        }
      },
      suppliers: {
        summary: suppliers.summary,
        supplierNames: suppliers.supplierNames,
        bySupplier: suppliers.bySupplier,
        items: suppliers.items
      },
      charts: {
        plantComparison,
        stockComparison,
        supplierPerformance,
        statusDistribution,
        modelCoverage,
        dailyTrend
      },
      dataQuality: {
        warnings: [...vallam.warnings, ...oragadam.warnings, ...suppliers.warnings],
        rowCount: rows.length
      }
    };

    setCache(cacheKey, payload);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      ...payload,
      cached: false,
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/diagnostics/layout
app.get("/api/diagnostics/layout", async (req, res, next) => {
  try {
    const info = await getSpreadsheetInfo();
    const dailyTabs = getSortedDailyTabs(info.tabs);
    const latest = dailyTabs.length > 0 ? dailyTabs[0] : null;

    const targetTabName = req.query.date ? String(req.query.date).trim() : (latest ? latest.name : null);
    if (!targetTabName) {
      return res.status(404).json({ success: false, message: "No tab found", requestId: req.requestId });
    }

    const rows = await readDailyTab(targetTabName);

    const vallamIdx = rows.findIndex(r => r.some(c => typeof c === "string" && c.toUpperCase().includes("VALLAM")));
    const oragadamIdx = rows.findIndex(r => r.some(c => typeof c === "string" && c.toUpperCase().includes("ORAGADAM")));
    const supplierIdx = rows.findIndex(r => r.some(c => typeof c === "string" && c.toUpperCase().includes("SUPPLIER") && r.some(x => typeof x === "string" && x.toUpperCase().includes("DISPATCH"))));

    const vallam = parsePlantSection(rows, "VALLAM", vallamIdx, oragadamIdx > -1 ? oragadamIdx : rows.length);
    const oragadam = parsePlantSection(rows, "ORAGADAM", oragadamIdx, supplierIdx > -1 ? supplierIdx : rows.length);
    const suppliers = parseSupplierSection(rows, supplierIdx, rows.length);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      success: true,
      selectedTab: targetTabName,
      totalRows: rows.length,
      detectedSections: {
        vallam: {
          headerRowIndex: vallamIdx >= 0 ? vallamIdx + 1 : null,
          supplierColumns: vallam.supplierCols,
          colMap: vallam.colMap,
          partCount: vallam.items.length,
          warnings: vallam.warnings
        },
        oragadam: {
          headerRowIndex: oragadamIdx >= 0 ? oragadamIdx + 1 : null,
          supplierColumns: oragadam.supplierCols,
          colMap: oragadam.colMap,
          partCount: oragadam.items.length,
          warnings: oragadam.warnings
        },
        supplierDispatch: {
          headerRowIndex: supplierIdx >= 0 ? supplierIdx + 1 : null,
          detectedSuppliers: suppliers.supplierNames,
          itemCount: suppliers.items.length,
          colMap: suppliers.colMap,
          warnings: suppliers.warnings
        }
      },
      availableDailyTabs: dailyTabs.map(t => ({ name: t.name, date: t.date })),
      nonDailyTabs: info.tabs.filter(t => !parseDailyTab(t)),
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/cache/clear
app.post("/api/cache/clear", (req, res) => {
  clearCache();
  res.json({
    success: true,
    message: "Backend cache cleared successfully",
    serverTime: new Date().toISOString(),
    requestId: req.requestId
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    requestedPath: req.path,
    availableEndpoints: [
      "GET /api/health",
      "GET /api/sheets",
      "GET /api/daily-data",
      "GET /api/daily-data-by-date?date=31.10.2026",
      "GET /api/dashboard",
      "GET /api/dashboard?date=30.10.2026",
      "GET /api/diagnostics/layout",
      "POST /api/cache/clear"
    ],
    requestId: req.requestId
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error(JSON.stringify({
    level: "error",
    requestId: req.requestId,
    message: error.message,
    status: error.status || 500
  }));

  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? "An internal server error occurred" : error.message,
    requestId: req.requestId
  });
});

// Start Server
const server = app.listen(CONFIG.port, () => {
  console.log("");
  console.log("==============================================");
  console.log(" ROYAL ENFIELD - WHEEL DISPATCH DASHBOARD");
  console.log("==============================================");
  console.log(`Backend URL: http://localhost:${CONFIG.port}`);
  console.log(`Environment: ${CONFIG.environment}`);
  console.log("Google Sheets: Configured & Verified");
  console.log("Permission: READ ONLY (google sheets readonly scope)");
  console.log("Daily tab detection: DYNAMIC ENABLED");
  console.log("Cache duration: 15 seconds");
  console.log("----------------------------------------------");
  console.log("API ENDPOINTS READY:");
  console.log(`- Health:      http://localhost:${CONFIG.port}/api/health`);
  console.log(`- Sheets info: http://localhost:${CONFIG.port}/api/sheets`);
  console.log(`- Daily data:  http://localhost:${CONFIG.port}/api/daily-data`);
  console.log(`- Dashboard:   http://localhost:${CONFIG.port}/api/dashboard`);
  console.log(`- Diagnostics: http://localhost:${CONFIG.port}/api/diagnostics/layout`);
  console.log("==============================================");
  console.log("");
});

function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);
  server.close(() => {
    console.log("Backend server stopped.");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = app;
