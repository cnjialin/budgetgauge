import fs from 'node:fs/promises';
import { build } from 'esbuild';

// Package the original editor, original category tree and date/time picker into
// one offline document, with only the isolated preview adapter and theme applied.
const result = await build({ entryPoints: ['script.js'], bundle: true, write: false,
  format: 'iife', minify: true, target: ['chrome100'], define: { 'import.meta.env': '{}' } });
const [markup, css, theme] = await Promise.all([
  fs.readFile('index.html', 'utf8'), fs.readFile('styles.css', 'utf8'), fs.readFile('water-record.css', 'utf8'),
]);
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const keypad = `<div id="waterKeypad" aria-label="金额数字键盘"><div class="water-key-grid">${['1','2','3','4','5','6','7','8','9','.','0','backspace'].map(key => `<button type="button" data-amount-key="${key}" aria-label="${key === 'backspace' ? '删除一位' : key}">${key === 'backspace' ? '⌫' : key}</button>`).join('')}</div><button id="quickExpenseContinueBtn" class="quick-expense-continue-btn" type="button" aria-label="继续" disabled>→</button></div>`;
let editor = markup.replace(/<link\b[^>]*>/g, '')
  .replace('</body>', '<p id="browseStatus" role="status"></p></body>')
  .replace('<body>', '<body class="water-record-view"><button id="waterQuickCancel" type="button" aria-label="返回"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg></button>')
  .replace('<div class="record-action-dock"', () => keypad + '<div class="record-action-dock"')
  .replace('</head>', () => `<style>${css}\n${theme}</style></head>`)
  .replace('<script type="module" src="script.js"></script>', () => `<script>${js}</script>`);
const source = await fs.readFile('public/water-demo.html', 'utf8');
const payload = JSON.stringify(editor).replace(/</g, '\\u003c');
const output = source.replace(/(<script id="recordBundle" type="application\/json">)[\s\S]*?(<\/script>)/, (_, a, b) => a + payload + b);
if (output === source && !source.includes('recordBundle')) throw new Error('Missing record bundle marker');
await fs.writeFile('public/water-demo.html', output);
await fs.mkdir('outputs', { recursive: true });
await fs.writeFile('outputs/water-demo.html', output);
console.log(`Standalone editor preview updated (${Math.round(Buffer.byteLength(output)/1024)} KB).`);
