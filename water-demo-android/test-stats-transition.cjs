const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const {build}=await import('esbuild');
 const source=fs.readFileSync('script.js','utf8')+`\nwindow.transitionTest={chart:()=>expenseStatsChart,change:changeStatsMonth,show(records){expenseHistory=records;openStatsModal();}};`;
 const result=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,format:'iife',define:{'import.meta.env':'{}'}});
 const html=fs.readFileSync('public/water-demo.html','utf8');
 const editor=JSON.parse(html.match(/<script id="recordBundle" type="application\/json">([\s\S]*?)<\/script>/)[1])
  .replace(/<script>[\s\S]*?<\/script>/,()=>'<script>'+result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>window.name='water-page-preview');
  await page.route('https://water-transition.test/',route=>route.fulfill({contentType:'text/html',body:editor}));
  await page.goto('https://water-transition.test/');
  await page.evaluate(()=>{
   const now=new Date(),date=offset=>new Date(now.getFullYear(),now.getMonth()+offset,15,12).toISOString();
   transitionTest.show([{id:1,amount:9,category:['餐饮'],time:date(0)},{id:2,amount:9,category:['交通'],time:date(0)},
    {id:3,amount:18,category:['餐饮'],time:date(-1)},{id:4,amount:2,category:['交通'],time:date(-1)}]);
  });
  await page.waitForTimeout(1200);
  const initial=await page.locator('#expenseSunburstChart').boundingBox();
  await page.evaluate(()=>{
   window.oldStatsChart=transitionTest.chart();window.oldStatsPiece=oldStatsChart.getModel().getSeriesByIndex(0).getData().tree.root.children.find(n=>n.name==='餐饮').piece;
   window.oldAngle=oldStatsPiece.shape.endAngle-oldStatsPiece.shape.startAngle;
   transitionTest.change(-1);
  });
  const retained=await page.evaluate(()=>({chart:transitionTest.chart()===oldStatsChart,piece:transitionTest.chart().getModel().getSeriesByIndex(0).getData().tree.root.children.find(n=>n.name==='餐饮').piece===oldStatsPiece}));
  assert.deepEqual(retained,{chart:true,piece:true},'Month changes retain chart and sector objects');
  await page.waitForTimeout(120);
  const midway=await page.evaluate(()=>({old:oldAngle,current:oldStatsPiece.shape.endAngle-oldStatsPiece.shape.startAngle}));
  assert(midway.current>midway.old+.05&&midway.current<Math.PI*1.8-.01,'Sector angles smoothly interpolate from the old size');
  const during=await page.locator('#expenseSunburstChart').boundingBox();assert.deepEqual(during,initial,'Chart position stays fixed during morph');
  await page.waitForTimeout(500);
  const final=await page.evaluate(()=>oldStatsPiece.shape.endAngle-oldStatsPiece.shape.startAngle);assert(Math.abs(final-Math.PI*1.8)<.01);
  console.log('PASS retained chart and sector identity, intermediate angle interpolation, final proportions and fixed center');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
