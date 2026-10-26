#!/usr/bin/env node
/**
 * Fantastic Posters generator.
 *
 * Single-poster modes:
 *   node generate.js "<brief>"                                     # auto-pick style, 1 image
 *   node generate.js "<brief>" --style=<style_id>                  # force a style
 *   node generate.js "<brief>" --n=3                               # 3 variations
 *   node generate.js "<brief>" --refs=hero.jpg,brand.pdf,logo.png  # multi-reference edit
 *   node generate.js "<brief>" --logo=<path>                       # logo-anchored edit
 *   node generate.js --brief=path/to/brief.{md,yaml,yml}           # structured brief
 *   node generate.js --batch=path/to/listings.json                 # iterate many briefs
 *   node generate.js --template=template.png "<brief>"             # replicate-template mode
 *
 * Flags:
 *   --size=portrait|landscape|square|WxH    (default: portrait → 1024x1536)
 *   --quality=low|medium|high               (default: medium)
 *   --palette="#hex,#hex,#hex"              (override style palette)
 *   --yes                                   (skip confirmation; ignored for ≥5 images or quality=high)
 *   --include-experimental                  (allow experimental styles in auto-picker)
 *   --list                                  (list all styles)
 *
 * Reference order (for --refs): image 1 = hero photo, image 2 = brand book, image 3+ = logos.
 * If a ref ends in .pdf, page 1 is auto-rendered to PNG at 2x DPI before upload.
 *
 * Reads FAL_KEY (and optional KIE_KEY) from .env or process.env. Writes PNGs to ./out/.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { styles, pickStyle, applyPaletteOverride } from './styles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'out');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ----- env loading -----
function loadKey(name) {
  if (process.env[name]) return process.env[name];
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, 'utf8').match(new RegExp(`${name}=(.+)`));
    if (m) return m[1].trim();
  }
  return null;
}
function loadFalKey() {
  const k = loadKey('FAL_KEY');
  if (!k) throw new Error('FAL_KEY missing. Add it to .env or export it.');
  return k;
}

// ----- argument parsing -----
function parseArgs(argv) {
  const args = {
    brief: '',
    style: null,
    n: 1,
    refs: [],
    logo: null,
    template: null,
    briefFile: null,
    batchFile: null,
    size: 'portrait',
    quality: 'medium',
    palette: null,
    yes: false,
    includeExperimental: false,
    list: false,
  };
  for (const a of argv.slice(2)) {
    if (a === '--list') args.list = true;
    else if (a === '--yes') args.yes = true;
    else if (a === '--include-experimental') args.includeExperimental = true;
    else if (a.startsWith('--style=')) args.style = a.slice(8);
    else if (a.startsWith('--n=')) args.n = Math.max(1, parseInt(a.slice(4), 10) || 1);
    else if (a.startsWith('--ref=')) args.refs = [a.slice(6)];
    else if (a.startsWith('--refs=')) args.refs = a.slice(7).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--logo=')) args.logo = a.slice(7);
    else if (a.startsWith('--template=')) args.template = a.slice(11);
    else if (a.startsWith('--brief=')) args.briefFile = a.slice(8);
    else if (a.startsWith('--batch=')) args.batchFile = a.slice(8);
    else if (a.startsWith('--size=')) args.size = a.slice(7);
    else if (a.startsWith('--quality=')) args.quality = a.slice(10);
    else if (a.startsWith('--palette=')) args.palette = a.slice(10);
    else if (!a.startsWith('--') && !args.brief) args.brief = a;
  }
  return args;
}

// ----- size + cost -----
function resolveSize(size) {
  const map = {
    portrait: { width: 1024, height: 1536 },
    landscape: { width: 1536, height: 1024 },
    square: { width: 1024, height: 1024 },
  };
  if (map[size]) return map[size];
  const m = String(size).match(/^(\d+)x(\d+)$/);
  if (m) {
    const w = Math.min(1536, parseInt(m[1], 10));
    const h = Math.min(1536, parseInt(m[2], 10));
    return { width: w, height: h };
  }
  return map.portrait;
}
const COST_PER_IMAGE = { low: 0.011, medium: 0.04, high: 0.17 };
function estimateCost(n, quality) {
  const c = COST_PER_IMAGE[quality] ?? 0.04;
  return { perImage: c, total: c * n };
}

async function confirmPrompt(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (ans) => {
      rl.close();
      resolve(/^y(es)?$/i.test(ans.trim()));
    });
  });
}

// ----- PDF → PNG (page 1, 2x DPI) -----
async function renderPdfToPng(pdfPath) {
  const outPath = pdfPath.replace(/\.pdf$/i, '.page1.png');
  if (fs.existsSync(outPath)) return outPath;
  let pdfjs;
  try {
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch {
    throw new Error('pdfjs-dist not installed. Run `npm install pdfjs-dist canvas` to enable PDF refs.');
  }
  let canvasPkg;
  try {
    canvasPkg = await import('canvas');
  } catch {
    throw new Error('`canvas` not installed. Run `npm install canvas` to enable PDF refs.');
  }
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const cv = canvasPkg.createCanvas(viewport.width, viewport.height);
  const ctx = cv.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  fs.writeFileSync(outPath, cv.toBuffer('image/png'));
  return outPath;
}

// ----- Reference handling -----
async function refToImageUrl(ref, kieKey) {
  if (/^https?:\/\//i.test(ref)) return ref;
  let p = ref;
  if (/\.pdf$/i.test(p)) {
    console.log(`  rendering PDF: ${path.basename(p)} → page1.png`);
    p = await renderPdfToPng(p);
  }
  if (!fs.existsSync(p)) throw new Error(`Reference not found: ${p}`);
  if (kieKey) {
    try {
      return await uploadToKie(p, kieKey);
    } catch (e) {
      console.warn(`  Kie upload failed (${e.message}), falling back to data URI`);
    }
  }
  const buf = fs.readFileSync(p);
  const ext = path.extname(p).slice(1).toLowerCase() || 'png';
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

async function uploadToKie(filePath, kieKey) {
  const buf = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([buf]), path.basename(filePath));
  const res = await fetch('https://kie.ai/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${kieKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Kie ${res.status}`);
  const json = await res.json();
  if (!json.url) throw new Error('Kie returned no url');
  return json.url;
}

// ----- Brief loaders -----
async function loadBrief(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const text = fs.readFileSync(filePath, 'utf8');
  if (ext === '.yaml' || ext === '.yml') {
    let yaml;
    try {
      yaml = await import('js-yaml');
    } catch {
      throw new Error('js-yaml not installed. Run `npm install js-yaml` to load YAML briefs.');
    }
    return yaml.load(text);
  }
  if (ext === '.json') return JSON.parse(text);
  // Default: parse simple `key: value` markdown
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([a-zA-Z_][\w]*)\s*:\s*(.+)$/);
    if (m) out[m[1].toLowerCase()] = m[2].trim();
  }
  return out;
}

function loadBatch(filePath) {
  const arr = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(arr)) throw new Error(`Batch file must be a JSON array: ${filePath}`);
  return arr;
}

// ----- Prompt building -----
const TEMPLATE_PROMPT = (fields) =>
  `Copy the layout, typography, logo, palette, and aspect ratio of the FIRST reference image EXACTLY. ` +
  `Replace only the hero photo (SECOND reference) and the text fields below: ${fields || '[no text changes]'}.`;

function buildPrompt({ styleId, brief, palette, template, fields, logo }) {
  let prompt;
  if (template) {
    prompt = TEMPLATE_PROMPT(fields);
  } else {
    const style = styles[styleId];
    if (!style) throw new Error(`Unknown style: ${styleId}`);
    const input = typeof brief === 'string' ? { subject: brief || undefined } : { ...brief };
    prompt = style.build(input);
  }
  if (logo) {
    prompt += `\n\nUse the supplied reference image EXACTLY as the wordmark — do NOT redraw, recolour, or modify proportions.`;
  }
  return applyPaletteOverride(prompt, palette);
}

// ----- list -----
function listStyles() {
  console.log('\nAvailable styles:\n');
  const ids = Object.keys(styles);
  for (const id of ids) {
    const s = styles[id];
    const flags = [];
    if (s.needsPhoto) flags.push('needs --ref');
    if (s.experimental) flags.push('experimental');
    const tag = flags.length ? `  [${flags.join(', ')}]` : '';
    console.log(`  ${id.padEnd(26)} ${s.label}${tag}`);
  }
  console.log(`\n${ids.length} total.\n`);
}

// ----- generation -----
async function generateOne({ falKey, prompt, refs, size, quality, variant, label }) {
  const useEdit = refs && refs.length > 0;
  const endpoint = useEdit
    ? 'https://fal.run/openai/gpt-image-2/edit'
    : 'https://fal.run/openai/gpt-image-2';
  const { width, height } = resolveSize(size);
  const body = {
    prompt: prompt + (variant > 0 ? ` (variant ${variant + 1}: subtly shift colour accent and framing)` : ''),
    image_size: { width, height },
    quality,
    num_images: 1,
    output_format: 'png',
  };
  if (useEdit) body.image_urls = refs;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.images?.length) throw new Error(`No images: ${JSON.stringify(json).slice(0, 300)}`);

  const ts = Date.now();
  const out = [];
  for (const img of json.images) {
    const fp = path.join(OUT_DIR, `${label}_${ts}_v${variant + 1}.png`);
    const buf = Buffer.from(await (await fetch(img.url)).arrayBuffer());
    fs.writeFileSync(fp, buf);
    out.push(fp);
  }
  return out;
}

async function runOne({ args, falKey, kieKey, briefObj, sharedRefs }) {
  const briefText =
    typeof briefObj === 'string'
      ? briefObj
      : briefObj.headline || briefObj.brief || briefObj.subject || briefObj.deliverable || '';
  const styleId =
    (typeof briefObj === 'object' && briefObj.style) ||
    args.style ||
    pickStyle(briefText, { includeExperimental: args.includeExperimental });

  if (!args.template && !styleId) {
    console.error(`No style matched. Pass --style=<id> or run --list.`);
    return [];
  }

  const label = args.template ? 'template' : styleId;
  if (args.template) console.log(`Mode: --template (replicate)`);
  else console.log(`Style: ${styleId} (${styles[styleId].label})`);

  // Resolve refs in canonical order: template → hero/brand/logos → explicit logo
  const refs = [];
  if (args.template) refs.push(await refToImageUrl(args.template, kieKey));
  // If brief object carries a logo, queue it after explicit refs
  const briefLogo = typeof briefObj === 'object' ? briefObj.logo : null;
  for (const r of [...(sharedRefs || []), ...(args.refs || [])]) {
    refs.push(await refToImageUrl(r, kieKey));
  }
  if (args.logo) refs.push(await refToImageUrl(args.logo, kieKey));
  if (briefLogo && !args.logo) refs.push(await refToImageUrl(briefLogo, kieKey));

  // Build prompt
  const palette = (typeof briefObj === 'object' && briefObj.palette) || args.palette;
  const fields =
    typeof briefObj === 'object'
      ? Object.entries(briefObj)
          .filter(([k]) => ['headline', 'body', 'details', 'footer', 'subtitle'].includes(k))
          .map(([k, v]) => `${k}="${v}"`)
          .join(', ')
      : '';
  const hasLogoRef = !!(args.logo || briefLogo || (refs.length && (args.template || (args.refs && args.refs.length))));
  const prompt = buildPrompt({
    styleId,
    brief: briefObj,
    palette,
    template: !!args.template,
    fields,
    logo: !!(args.logo || briefLogo),
  });

  const saved = [];
  for (let v = 0; v < args.n; v++) {
    process.stdout.write(`  generating ${v + 1}/${args.n}... `);
    try {
      const files = await generateOne({
        falKey,
        prompt,
        refs,
        size: args.size,
        quality: args.quality,
        variant: v,
        label,
      });
      saved.push(...files);
      console.log(files.map((fp) => path.relative(__dirname, fp)).join(', '));
    } catch (e) {
      console.error(`FAILED: ${e.message}`);
    }
    if (v < args.n - 1) await new Promise((r) => setTimeout(r, 1500));
  }
  return saved;
}

// ----- main -----
async function main() {
  const args = parseArgs(process.argv);
  if (args.list) return listStyles();

  let briefs = null;
  if (args.batchFile) briefs = loadBatch(args.batchFile);
  else if (args.briefFile) briefs = [await loadBrief(args.briefFile)];
  else if (args.brief) briefs = [args.brief];

  if (!briefs || briefs.length === 0) {
    console.error('Usage: node generate.js "<brief>" [--style=ID] [--n=N] [--refs=img1,img2,...] [--logo=path]');
    console.error('       [--size=portrait|landscape|square|WxH] [--quality=low|medium|high] [--palette="#hex,..."] [--yes]');
    console.error('       node generate.js --brief=path/to/brief.{md,yaml,yml}');
    console.error('       node generate.js --batch=path/to/listings.json');
    console.error('       node generate.js --template=existing-poster.png "<brief>"');
    console.error('       node generate.js --list');
    process.exit(1);
  }

  // Cost estimate + confirmation
  const totalImages = briefs.length * args.n;
  const cost = estimateCost(totalImages, args.quality);
  console.log(
    `\nEstimated cost: $${cost.total.toFixed(2)} (${totalImages} images × $${cost.perImage.toFixed(3)} at quality=${args.quality})`
  );
  const forcePrompt = totalImages >= 5 || args.quality === 'high';
  if (forcePrompt || !args.yes) {
    const ok = await confirmPrompt(forcePrompt ? 'Sizable run — confirm to continue?' : 'Continue?');
    if (!ok) {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  const falKey = loadFalKey();
  const kieKey = loadKey('KIE_KEY');

  const allSaved = [];
  for (const b of briefs) {
    const saved = await runOne({ args, falKey, kieKey, briefObj: b, sharedRefs: [] });
    allSaved.push(...saved);
  }
  console.log(`\nDone. ${allSaved.length} file(s) in ${OUT_DIR}.`);
  console.log(`Tip: open the PNG in Canva and run Magic / Smart Layers to split foreground / background / text.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
