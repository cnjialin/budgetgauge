const {chromium}=require('C:/Users/asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 for(const [width,height] of [[390,844],[320,568]]) {
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
  let offline=false,passwordRequests=0;
  const user={id:'00000000-0000-4000-8000-000000000001',email:'test@example.com',aud:'authenticated',role:'authenticated'};
  const jwt=[{alg:'HS256',typ:'JWT'},{sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'},'signature'].map((x,i)=>i===2?x:Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  await page.route('https://test-project.supabase.co/**',async route=>{
   const req=route.request(),url=req.url();
   const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST,GET,OPTIONS'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(offline)return route.abort('internetdisconnected');
   if(url.includes('/rest/v1/money'))return route.fulfill({status:200,headers,json:[]});
   if(url.includes('/token')) {
    if(url.includes('grant_type=password'))passwordRequests++;
    if(req.postDataJSON().password==='wrong')return route.fulfill({status:400,headers,json:{error_code:'invalid_credentials',msg:'Invalid login credentials'}});
    return route.fulfill({status:200,headers,json:{access_token:jwt,refresh_token:'test-refresh-token',expires_in:3600,token_type:'bearer',user}});
   }
   if(url.includes('/user'))return route.fulfill({status:200,headers,json:user});
   return route.fulfill({status:204,headers});
  });
  await page.goto('file:///E:/codex/outputs/water-demo.html');
  await page.frameLocator('#recordFrame').locator('#remainingBudget').waitFor({state:'attached'});
  await page.mouse.move(width/2,height*.3);await page.mouse.down();await page.mouse.move(width/2,height*.65,{steps:10});await page.mouse.up();
  await page.waitForTimeout(650);
  assert(await page.locator('#loginPage').getAttribute('aria-hidden')==='false');
  assert(await page.locator('#recordFrame').isHidden());
  await page.screenshot({path:`water-demo-android/build/ui-check/login-${width}.png`});
  await page.locator('#loginEmail').fill('test@example.com');await page.locator('#loginPassword').fill('wrong');
  await page.locator('#loginConnection summary').click();
  await page.locator('#loginUrl').fill('https://test-project.supabase.co');await page.locator('#loginKey').fill('sb_publishable_test');
  await page.locator('#loginSubmit').click();
  await page.getByText('邮箱或密码不正确',{exact:true}).waitFor();
  await page.locator('#loginPassword').fill('synthetic-success-password');await page.locator('#loginSubmit').click();
  await page.getByText('已登录 · test@example.com',{exact:true}).waitFor();
  assert(await page.locator('#loginPassword').inputValue()==='');
  assert(!await page.evaluate(()=>JSON.stringify(localStorage).includes('synthetic-success-password')));
  await page.reload();await page.frameLocator('#recordFrame').locator('#remainingBudget').waitFor({state:'attached'});
  await page.locator('#water').focus();await page.keyboard.press('ArrowDown');await page.waitForTimeout(650);
  await page.getByText('已登录 · test@example.com',{exact:true}).waitFor();
  const savedRequests=passwordRequests;
  // Reproduce the old 5-second lock-stealing failure while a session is busy.
  await page.evaluate(()=>new Promise(resolve=>{
    window.lockStolen=false;
    navigator.locks.request('lock:water-auth-session-test-project.supabase.co',()=>new Promise(release=>{
      window.releaseSessionLock=release;resolve();
    })).catch(()=>{window.lockStolen=true;});
  }));
  await page.locator('#loginReconnect').click();
  await page.waitForTimeout(5500);
  assert.equal(await page.evaluate(()=>window.lockStolen),false,'Reconnect must not steal the session lock');
  assert(await page.locator('#loginReconnect').isDisabled());
  await page.evaluate(()=>window.releaseSessionLock());
  await page.getByText('已登录 · test@example.com',{exact:true}).waitFor();
  await page.locator('#loginReconnect').waitFor({state:'visible'});
  assert.equal(await page.locator('#loginReconnect').isDisabled(),false);
  offline=true;
  await page.locator('#loginReconnect').click();
  await page.getByText('暂时无法连接服务器，网络恢复后点击“重新连接”，无需输入密码',{exact:true}).waitFor();
  assert.equal(await page.locator('#loginPassword').inputValue(),'');
  assert(await page.evaluate(()=>!!localStorage.getItem('water-auth-session-test-project.supabase.co')));
  offline=false;
  await page.locator('#loginReconnect').click();
  await page.getByText('已登录 · test@example.com',{exact:true}).waitFor();
  assert.equal(passwordRequests,savedRequests,'Reconnect must never submit a password');
  await page.locator('#loginLogout').click();await page.getByText('已退出登录',{exact:true}).waitFor();
  assert(await page.locator('#loginReconnect').isHidden());
  await page.locator('#loginPage').evaluate(e=>e.scrollTop=e.scrollHeight);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:12,y:height*.75}]});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:12,y:height*(.75-i*.035)}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(150);
  const heading=await page.locator('main > header').evaluate(e=>({opacity:Number(getComputedStyle(e).opacity),visibility:getComputedStyle(e).visibility}));
  assert(heading.opacity===1&&heading.visibility==='visible','Spending header must stay opaque beneath the sliding login page');
  const cover=await page.locator('#loginPage').evaluate(e=>({background:getComputedStyle(e).backgroundColor,bottom:e.getBoundingClientRect().bottom}));
  assert(cover.background==='rgb(255, 255, 255)'&&cover.bottom>0&&cover.bottom<height,'Opaque login page must progressively uncover the home screen');
  await page.waitForTimeout(500);
  assert(await page.locator('#loginPage').getAttribute('aria-hidden')==='true','Login swipe up must return home');
  assert(await page.locator('#recordFrame').isHidden(),'Return gesture must not open recording');
  await page.locator('#water').focus();await page.keyboard.press('ArrowDown');await page.waitForTimeout(650);
  assert(await page.evaluate(()=>window.waterBack())===true);await page.waitForTimeout(650);
  assert(await page.locator('#loginPage').getAttribute('aria-hidden')==='true');
  console.log('PASS login layout, slide, mocked Auth failure/success/restore/logout, password not stored',width);
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
