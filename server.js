// Apna PDF Service
// POST /pdf  ->  HTML ya template + data bhejo, PDF wapas lo
const express = require('express');
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || '';           // zaroor set karna
const TEMPLATES_DIR = path.join(__dirname, 'templates');

const app = express();
app.use(express.json({ limit: '20mb' }));

// ---------- Auth: har request par x-api-key header chahiye ----------
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!API_KEY) return next(); // local testing ke liye
  const key = req.get('x-api-key') || req.query.api_key;
  if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
  next();
});

// ---------- Browser ek baar launch, baar baar reuse ----------
let browserPromise;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    browserPromise.then(b => b.on('disconnected', () => { browserPromise = null; }));
  }
  return browserPromise;
}

function loadTemplate(name) {
  const safe = path.basename(name).replace(/\.html$/, '');
  const file = path.join(TEMPLATES_DIR, `${safe}.html`);
  if (!fs.existsSync(file)) throw new Error(`Template not found: ${safe}`);
  return Handlebars.compile(fs.readFileSync(file, 'utf8'));
}

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/templates', (req, res) => {
  const list = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.html')).map(f => f.replace('.html', ''));
  res.json({ templates: list });
});

/*
 Body (JSON):
 {
   "html": "<h1>Hello</h1>",            // YA
   "template": "default", "data": {...}, // template + data
   "filename": "invoice-123.pdf",
   "output": "file" | "base64",          // default: file
   "options": { "format": "A4", "landscape": false, "margin": "20mm" }
 }
*/
app.post('/pdf', async (req, res) => {
  const { html, template, data = {}, filename = 'document.pdf', output = 'file', options = {} } = req.body || {};
  if (!html && !template) return res.status(400).json({ error: 'html ya template dena zaroori hai' });

  let page;
  try {
    const content = html ? html : loadTemplate(template)(data);
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setContent(content, { waitUntil: 'networkidle0', timeout: 30000 });

    const m = options.margin || '15mm';
    const pdf = Buffer.from(await page.pdf({
      format: options.format || 'A4',
      landscape: !!options.landscape,
      printBackground: true,
      margin: { top: m, right: m, bottom: m, left: m },
    }));

    const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    if (output === 'base64') {
      return res.json({ filename: name, mimeType: 'application/pdf', size: pdf.length, base64: pdf.toString('base64') });
    }
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"` });
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (page) await page.close().catch(() => {});
  }
});

app.listen(PORT, () => console.log(`PDF service running on port ${PORT}`));
