import { createClient, processLock } from '@supabase/supabase-js';
import { fetchAllExpenseRecords } from './monthly-stats.js';

// Share the authenticated client with the water UI's ledger adapter.
let client, config, subscription;
let operationQueue = Promise.resolve();
function queueOperation(operation) {
  const result = operationQueue.then(operation);
  operationQueue = result.catch(() => {});
  return result;
}
// Keep session recovery and ledger requests ordered within this WebView.
export function waterAuth(action,value,notify) {
  return queueOperation(()=>runWaterAuth(action,value,notify));
}
export function waterLedger(action,value,notify) {
  return queueOperation(()=>runWaterLedger(action,value,notify));
}
// A slow network request may legitimately hold the session lock for 15 seconds.
// Never steal it: the previous request would keep running without exclusion.
async function sessionLock(name,timeout,operation) {
  if(!globalThis.navigator?.locks)return processLock(name,timeout===0?0:30000,operation);
  const controller=new AbortController();
  const timer=timeout===0?null:setTimeout(()=>controller.abort(),30000);
  try {
    return await navigator.locks.request(name,timeout===0?{mode:'exclusive',ifAvailable:true}:{mode:'exclusive',signal:controller.signal},async lock=>{
      if(!lock)throw Object.assign(Error('登录连接正忙，请稍后点击重新连接'),{isAcquireTimeout:true});
      clearTimeout(timer);
      return operation();
    });
  } catch(error) {
    if(controller.signal.aborted)throw Object.assign(Error('等待登录连接超时，请点击重新连接'),{isAcquireTimeout:true});
    throw error;
  } finally {clearTimeout(timer);}
}
const configKey = 'water-auth-config';
function identity(user) {
  return {email:user?.email||'',owner:user?.id?config.url+'|'+user.id:''};
}
let ledgerWriting = false;
async function runWaterLedger(action, value, notify) {
  const mutation=['ledger-update','ledger-delete'].includes(action);
  const result = action === 'ledger-stats' ? 'ledger-stats-data' : mutation?'ledger-mutated':action === 'ledger-save' ? 'ledger-saved' : 'ledger-data';
  const owner = value?.owner;
  const operationId = value?.operationId;
  if (action === 'ledger-save' && ledgerWriting) {notify(result,{owner,operationId,error:'同步繁忙，稍后重试'});return;}
  if (action === 'ledger-save') ledgerWriting = true;
  try {
    const active = client;
    if (!active) throw Error('请先登录');
    // Reuse/refresh the saved session; the data API authenticates every request.
    // Avoid a separate network round trip to /user before each ledger operation.
    const {data:sessionData,error:authError} = await active.auth.getSession();
    if (authError) throw authError;
    const auth={user:sessionData.session?.user};
    if (!auth.user || owner !== identity(auth.user).owner || active !== client) throw Error('登录状态已变化，请重试');
    if (action === 'ledger-stats') {
      const records = await fetchAllExpenseRecords(active, auth.user.id);
      notify(result, { owner, requestId: value.requestId, records });
    } else if(mutation) {
      const record=value.record;
      if(!record?.id)throw Error('记录编号无效');
      let query;
      if(action==='ledger-delete')query=active.from('money').delete();
      else {
        if(!Number.isFinite(record.amount)||record.amount<=0||!Number.isFinite(new Date(record.time).getTime())||!Array.isArray(record.category)||!record.category.every(c=>typeof c==='string'))throw Error('请检查金额、分类和时间');
        query=active.from('money').update({amount:record.amount,category:record.category.length?record.category:null,time:record.time,type:'expense'});
      }
      const {data,error}=await query.eq('id',record.id).eq('user_id',auth.user.id).select('id, amount, type, category, time').maybeSingle();
      if(error)throw error;
      if(!data&&action==='ledger-update')throw Error('云端记录已删除或不可访问，请核对待同步修改');
      notify(result,{owner,operationId,record:data||{id:record.id},deleted:action==='ledger-delete'});
    } else if (action === 'ledger-save') {
      const record=value.record;
      if (!Number.isFinite(record?.amount) || record.amount<=0 || !Number.isFinite(new Date(record.time).getTime())) throw Error('请检查金额和时间');
      if (!Array.isArray(record.category) || !record.category.every(x=>typeof x==='string')) throw Error('请检查消费分类');
      if(!Number.isSafeInteger(record.id)||record.id>=0)throw Error('无效的本地记录编号');
      const payload={id:record.id,user_id:auth.user.id,amount:Math.round(record.amount*100)/100,type:'expense',category:record.category.length?record.category:null,time:record.time};
      // Client-generated negative IDs do not overlap the existing positive identity sequence.
      // Check first on retry: a lost response must not insert a second expense.
      const lookup=()=>active.from('money').select('id, amount, type, category, time').eq('user_id',auth.user.id).eq('id',record.id).maybeSingle();
      let {data,error}=await lookup();
      if(error)throw error;
      if(!data) {
        ({data,error}=await active.from('money').insert(payload).select('id, amount, type, category, time').single());
        if(error?.code==='23505')({data,error}=await lookup());
        if(error)throw error;
      }
      if (!data) throw Error('未收到保存结果，请刷新记录后核对');
      if(Math.round(Number(data.amount)*100)!==Math.round(record.amount*100)||data.type!=='expense'||new Date(data.time).getTime()!==new Date(record.time).getTime()||JSON.stringify(data.category||[])!==JSON.stringify(record.category||[]))throw Error('记录编号冲突，请核对待同步记录');
      notify(result,{owner,operationId,record:data});
    } else {
      const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1).toISOString(),end=new Date(now.getFullYear(),now.getMonth()+1,1).toISOString();
      const records=[];
      for(let offset=0;;offset+=500) {
        const {data,error}=await active.from('money').select('id, amount, type, category, time').eq('type','expense').eq('user_id',auth.user.id).gte('time',start).lt('time',end).order('time',{ascending:false}).order('id',{ascending:false}).range(offset,offset+499);
        if(error)throw error;
        if(!Array.isArray(data))throw Error('消费记录返回格式有误');
        records.push(...data);
        if(data.length<500)break;
      }
      notify(result,{owner,records});
    }
  } catch(error) {
    notify(result,{owner,operationId,requestId:value?.requestId,error:error.message||'连接失败，请重试'});
  } finally {if(action==='ledger-save')ledgerWriting=false;}
}
function checkedConfig(value) {
  const url = new URL(value.url);
  if (url.protocol !== 'https:' || url.username || url.password) throw Error('请输入 HTTPS 项目地址');
  const key = String(value.key || '').trim();
  let publicKey = key.startsWith('sb_publishable_');
  if (!publicKey) {
    try { publicKey = JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role === 'anon'; } catch {}
  }
  if (!publicKey) throw Error('请填写项目的 publishable 或 anon 公钥');
  return {url:url.origin,key,email:String(value.email||'').trim()};
}
async function connect(next, notify) {
  if (client && config.url === next.url && config.key === next.key) return client;
  subscription?.unsubscribe();
  if (client) await client.auth.stopAutoRefresh();
  config = next;
  client = createClient(next.url,next.key,{auth:{storageKey:'water-auth-session-'+new URL(next.url).hostname,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,lock:sessionLock},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(15000)})}});
  subscription = client.auth.onAuthStateChange((_event,session)=>notify('auth-state',identity(session?.user))).data.subscription;
  return client;
}
async function runWaterAuth(action, value, notify) {
  try {
    if(action==='auth-init'||action==='auth-reconnect') {
      const saved=JSON.parse(localStorage.getItem(configKey)||'null');
      if(!saved) {
        if(action==='auth-reconnect')throw Error('尚未保存登录凭证，请先用邮箱和密码登录一次');
        notify('auth-state',{email:''});return;
      }
      const next=checkedConfig(saved);
      notify('auth-config',{...next,canReconnect:!!localStorage.getItem('water-auth-session-'+new URL(next.url).hostname)});
      const auth=await connect(next,notify);
      const {data:sessionData,error:sessionError}=await auth.auth.getSession();
      if(sessionError)throw sessionError;
      if(!sessionData.session) {
        if(action==='auth-reconnect')throw Error('登录凭证已失效，请用邮箱和密码重新登录');
        notify('auth-state',{email:''});return;
      }
      if(action==='auth-init') {
        notify('auth-state',identity(sessionData.session.user));return;
      }
      const {data,error}=await auth.auth.getUser();
      if(error)throw error;
      if(action==='auth-reconnect')notify('auth-result',{ok:true,...identity(data.user),reconnected:true,message:'已重新连接'});
      else notify('auth-state',identity(data.user));
      return;
    }
    if(action==='auth-login') {
      if(!value?.email?.trim()||!value.password)throw Error('请输入邮箱和密码');
      const next=checkedConfig(value),auth=await connect(next,notify);
      const {data,error}=await auth.auth.signInWithPassword({email:next.email,password:value.password});
      if(error)throw error;
      if(!data.session)throw Error('未取得登录会话，请重试');
      localStorage.setItem(configKey,JSON.stringify(next));
      notify('auth-result',{ok:true,...identity(data.user),message:'登录成功'});
    }
    if(action==='auth-logout') {
      if(client){const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;}
      notify('auth-result',{ok:true,email:'',message:'已退出登录'});
    }
  } catch(error) {
    const network=error.name==='AuthRetryableFetchError'||['AbortError','TimeoutError'].includes(error.name)||/failed to fetch|network|timed? ?out/i.test(error.message||'');
    const expired=['refresh_token_not_found','refresh_token_already_used','session_not_found','session_expired','user_not_found','bad_jwt'].includes(error.code);
    notify('auth-result',{ok:false,message:network?'暂时无法连接服务器，网络恢复后点击“重新连接”，无需输入密码':expired?'登录凭证已失效，请用邮箱和密码重新登录':error.message==='Invalid login credentials'?'邮箱或密码不正确':error.message||'连接失败，请重试'});
  }
}
