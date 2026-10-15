import fs from 'node:fs/promises';
import { build } from 'esbuild';

// Package the original editor, original category tree and date/time picker into
// one offline document, with only the isolated preview adapter and theme applied.
const result = await build({ entryPoints: ['script.js'], bundle: true, write: false,
  format: 'iife', minify: true, target: ['chrome100'], define: { 'import.meta.env': '{}' } });
const [markup, css, baseTheme, v3Theme, shellTheme] = await Promise.all([
  fs.readFile('index.html', 'utf8'), fs.readFile('styles.css', 'utf8'), fs.readFile('water-record.css', 'utf8'),
  fs.readFile('water-motion.css', 'utf8'), fs.readFile('water-motion.css', 'utf8'),
]);
const theme = baseTheme + '\n' + v3Theme;
const motion = await build({entryPoints:['water-v3-motion.js'],bundle:true,write:false,format:'iife',minify:true,target:['chrome100']});
const motionScript = `<script id="v3Motion">${motion.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`;
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const keypad = `<div id="waterKeypad" aria-label="金额数字键盘"><div class="water-key-grid">${['1','2','3','4','5','6','7','8','9','.','0','backspace'].map(key => `<button type="button" data-amount-key="${key}" aria-label="${key === 'backspace' ? '删除一位' : key}">${key === 'backspace' ? '⌫' : key}</button>`).join('')}</div><button id="quickExpenseContinueBtn" class="quick-expense-continue-btn" type="button" aria-label="继续" disabled>→</button></div>`;
let editor = markup.replace(/<link\b[^>]*>/g, '')
  .replace('</body>', '<p id="browseStatus" role="status"></p></body>')
  .replace('<body>', '<body class="water-record-view"><button id="waterQuickCancel" type="button" aria-label="返回"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg></button>')
  .replace('<div class="record-action-dock"', () => keypad + '<div class="record-action-dock"')
  .replace('</head>', () => `<style>${css}\n${theme}</style></head>`)
  .replace('<script type="module" src="script.js"></script>', () => `<script>${js}</script>${motionScript}`);
const source = (await fs.readFile('public/water-demo.html', 'utf8')).replace(/\r\n/g, '\n');
const payload = JSON.stringify(editor).replace(/</g, '\\u003c');
const update = await build({ entryPoints: ['water-update.js'], bundle: true, write: false,
  format: 'iife', minify: true, target: ['chrome100'] });
const updateScript = `<script id="updateBundle">${update.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script>`;
let output = source.replace(/(<script id="recordBundle" type="application\/json">)[\s\S]*?(<\/script>)/, (_, a, b) => a + payload + b);
output = output.replace(/<style id="v3Theme">[\s\S]*?<\/style>\s*/, '');
output = output.replace('</head>', () => `<style id="v3Theme">${shellTheme}</style>\n</head>`);
output = output.replace(/<script id="v3Motion">[\s\S]*?<\/script>\s*/, '');
output = output.replace('</body>', () => motionScript + '\n</body>');
const sky = await build({entryPoints:['real-sky.js'],bundle:true,write:false,format:'iife',minify:true,target:['chrome100']});
const solarWorker=await build({entryPoints:['sky-solar-worker.js'],bundle:true,write:false,format:'iife',minify:true,target:['chrome100']});
const texture='data:image/jpeg;base64,'+(await fs.readFile('public/milky-way-gaia.jpg')).toString('base64');
const catalog = (await fs.readFile('public/real-sky-catalog.json','utf8')).replace(/^\uFEFF/,'').trim();
const skyBundle = `<script id="realSkyCatalog" type="application/json">${catalog.replace(/</g,'\\u003c')}</script>\n<script id="solarWorkerSource" type="application/json">${JSON.stringify(solarWorker.outputFiles[0].text).replace(/</g,'\\u003c')}</script>\n<script id="galaxyTexture" type="application/json">${JSON.stringify(texture)}</script>\n<script id="realSkyBundle">${sky.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`;
output=output.replace(/<script id="realSkyCatalog"[\s\S]*?<script id="realSkyBundle">[\s\S]*?<\/script>\r?\n?/,'');
output=output.replace('<script id="recordBundle"',()=>skyBundle+'\n<script id="recordBundle"');
output=output.replace(/\n(?:[ \t]*\n)+(?=<script id="realSkyCatalog")/g,'\n');
output = output.includes('<script id="updateBundle">')
  ? output.replace(/<script id="updateBundle">[\s\S]*?<\/script>/, () => updateScript)
  : output.replace('</body>', () => updateScript + '\n</body>');
if (output === source && !source.includes('recordBundle')) throw new Error('Missing record bundle marker');
await fs.writeFile('public/water-demo.html', output);
await fs.mkdir('outputs', { recursive: true });
await fs.writeFile('outputs/water-demo.html', output);
console.log(`Standalone editor preview updated (${Math.round(Buffer.byteLength(output)/1024)} KB).`);
