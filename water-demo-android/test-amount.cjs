const fs=require('fs'),assert=require('assert');
const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
const page=await browser.newPage();
const html=fs.readFileSync('public/water-demo.html','utf8');
await page.setContent('<style>'+html.match(/<style>([\s\S]*?)<\/style>/)[1]+'</style><span id="monthAmount"></span><span id="lightMonthAmount" class="month-value"></span>');
const source=html.slice(html.indexOf('  let displayedMonthAmount='),html.indexOf("  let ledgerOwner"));
await page.evaluate(source+`;window.amountTest={set:setMonthAmount,tick:tickMonthAmount,reset(value){monthAmountMotion=null;monthAmountTarget=null;displayedMonthAmount=null;setMonthAmount(value);},reduce(value){reducedMotion.matches=value;}};`.replace(/^/,"const monthAmount=document.querySelector('#monthAmount'),reducedMotion={matches:false};\n"));
for(const [from,to,count] of [[123.45,156.78,4],[999.99,1000,6],[1000,9.01,5],[12.34,12.34,0]]){
await page.evaluate(([a,b])=>{amountTest.reset(a);amountTest.set(b);},[from,to]);
assert.equal(await page.locator('#monthAmount .amount-strip').count(),count);
await page.evaluate(()=>amountTest.tick(.3));
assert.equal(await page.locator('#monthAmount').innerHTML(),await page.locator('#lightMonthAmount').innerHTML());
await page.evaluate(()=>amountTest.tick(.8));
assert.equal(await page.locator('#monthAmount').textContent(),'¥'+to.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}));
assert.equal(await page.locator('.amount-strip').count(),0);
}
await page.evaluate(()=>{amountTest.reset(12);amountTest.set(35);amountTest.tick(.2);amountTest.set(46);amountTest.tick(1.1);});
assert.equal(await page.locator('#monthAmount').textContent(),'¥46.00');
await page.evaluate(()=>{amountTest.reduce(true);amountTest.set(90);});
assert.equal(await page.locator('#monthAmount').textContent(),'¥90.00');
console.log('PASS: digit reels, unchanged positions, carry, decreasing digit count, synchronized layers, interruption, reduced motion.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
