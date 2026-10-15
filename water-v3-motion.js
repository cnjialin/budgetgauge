// Presentation only: never writes ledger data or intercepts the app's gestures.
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const running = new Map();
const ease = 'cubic-bezier(.22,1,.36,1)';
function motion(node, frames, options = {}) {
  if (!node || reduce.matches || document.hidden) return;
  running.get(node)?.cancel();
  const animation = node.animate(frames, { duration: 420, easing: ease, fill: 'backwards', ...options });
  running.set(node, animation);
  const finish = () => { if (running.get(node) === animation) running.delete(node); };
  animation.onfinish = finish;
  animation.oncancel = finish;
  return animation;
}
function stop() { for (const animation of running.values()) animation.cancel(); running.clear(); }
reduce.addEventListener('change', () => { if (reduce.matches) stop(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

// Keep the backdrop at full width and collapse the entire header, including
// its whitespace. Scaling the text alone leaves a large empty header behind.
function maskHeadingContent(page,shell){
  const edge=shell.getBoundingClientRect().bottom;
  for(const section of page.querySelectorAll(':scope > .settings-section,:scope > #loginForm')){
    const rect=section.getBoundingClientRect();
    const hidden=Math.max(0,Math.min(rect.height,edge-rect.top));
    section.style.clipPath=hidden?`inset(${hidden/(Number(getComputedStyle(section).scale)||1)}px 0 0 0)`:'none';
  }
}
function scrollTitle(scroller, title, back) {
  if (!scroller || !title) return;
  const shell=document.createElement('div');
  shell.className='water-scroll-heading';
  const slot=document.createElement('div');
  slot.className='water-heading-title-slot';
  title.before(shell);shell.append(slot);slot.append(title);
  if(back)shell.append(back);
  const isHistory=scroller.id==='historyMonthList';
  if(isHistory){
    document.querySelector('#historyModal').classList.add('water-collapsing-page');
  }else scroller.classList.add('water-collapsing-page');
  let frame = 0,previousProgress=0;
  const paint = () => {
    frame = 0;
    let p = reduce.matches ? 0 : Math.min(1, Math.max(0, scroller.scrollTop) / 96);
    if(isHistory&&scroller.querySelector('.is-expanded')&&!reduce.matches)p=Math.max(previousProgress,p);
    previousProgress=p;
    shell.style.setProperty('--heading-progress',String(p));
    title.style.scale=String(1-.23*p);
    if(isHistory){
      document.querySelector('#historyPagerViewport').style.marginTop=`${20-8*p}px`;
      parent.postMessage({channel:'water-motion',action:'history-scroll',progress:p},'*');
    }else {
      fadeBack(back,p);
      maskHeadingContent(scroller,shell);
    }
  };
  scroller.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(paint); }, { passive: true });
  reduce.addEventListener('change', paint);
  addEventListener('resize',paint);
  paint();
  return paint;
}

function fadeBack(button,progress){
  if(!button)return;
  button.style.opacity=String(Math.max(0,1-progress*2));
  button.style.visibility=progress>=.5?'hidden':'';
  button.style.pointerEvents=progress>=.5?'none':'';
}
window.addEventListener('message',event=>{
  if(event.source!==document.querySelector('#sideFrame')?.contentWindow||event.data?.channel!=='water-motion'||event.data.action!=='history-scroll')return;
  fadeBack(document.querySelector('#sideBack'),Math.max(0,Math.min(1,Number(event.data.progress)||0)));
});
const sidePage=document.querySelector('#sidePage');
if(sidePage)new MutationObserver(()=>{
  if(sidePage.getAttribute('aria-hidden')==='true')fadeBack(document.querySelector('#sideBack'),0);
}).observe(sidePage,{attributes:true,attributeFilter:['aria-hidden']});

const history = document.querySelector('#historyMonthList');
if (history && document.body.classList.contains('water-record-view')) {
  const title = document.querySelector('#historyModalTitle');
  const paintHistoryHeading=scrollTitle(history, title);
  const seen = new Set();
  let armed = false;
  let historyEpoch=0,historyBusy=false,overviewScroll=0,closePromise=null;
  const revealRow=(row,index)=>{
    if(seen.has(row.dataset.dateKey)){row.classList.remove('history-row-pending');return;}
    seen.add(row.dataset.dateKey);
    if(!history.querySelector('.is-expanded'))motion(row,
      [{clipPath:'inset(0 0 100% 0)',translate:'0 -10px'},{clipPath:'inset(0 0 0% 0)',translate:'0 0'}],
      {duration:280,delay:Math.min(index*32,160)});
    row.classList.remove('history-row-pending');
  };
  const observer = new IntersectionObserver(entries => {
    let sequence = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting || !armed) continue;
      const row = entry.target;
      observer.unobserve(row);
      revealRow(row,sequence++);
    }
  }, { root: history, threshold: .05 });
  const observeRows = () => {
    observer.disconnect();
    if (!armed || historyBusy) return;
    const viewport=history.getBoundingClientRect();
    let index=0;
    history.querySelectorAll('.history-item-month:not(.is-collapsed-sibling)').forEach(row => {
      const bounds=row.getBoundingClientRect();
      if(bounds.bottom>viewport.top&&bounds.top<viewport.bottom)revealRow(row,index++);
      else {
        if(!seen.has(row.dataset.dateKey)&&!reduce.matches)row.classList.add('history-row-pending');
        observer.observe(row);
      }
    });
  };
  // A fully clipped row has no IntersectionObserver intersection. Geometry
  // checks on scroll reveal it before paint, including programmatic scrolling.
  let rowScrollFrame=0;
  history.addEventListener('scroll',()=>{
    if(!rowScrollFrame)rowScrollFrame=requestAnimationFrame(()=>{rowScrollFrame=0;observeRows();});
  },{passive:true});
  reduce.addEventListener('change',()=>{
    if(reduce.matches)history.querySelectorAll('.history-row-pending').forEach(row=>row.classList.remove('history-row-pending'));
    observeRows();
  });
  const detailSeen=new WeakSet();
  new MutationObserver(() => {
    if(historyBusy)return;
    observeRows();
    history.querySelectorAll('.history-day-details').forEach(details=>{
      if(detailSeen.has(details))return;
      detailSeen.add(details);
      motion(details,[{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0% 0)'}],{duration:300});
      details.querySelectorAll('.history-day-detail-row').forEach((row,i)=>motion(row,
        [{opacity:0,translate:'0 -8px'},{opacity:1,translate:'0 0'}],{duration:240,delay:Math.min(i*28,140)}));
    });
  }).observe(history, { childList: true });
  const visibleInList=node=>{
    const rect=node.getBoundingClientRect(),view=history.getBoundingClientRect();
    return rect.height>0&&rect.bottom>view.top&&rect.top<view.bottom;
  };
  const awaitMotion=animations=>Promise.all(animations.filter(Boolean).map(a=>a.finished.catch(()=>{})));
  // Keep only visible outgoing cards as a temporary visual layer. Rebuild
  // immediately so the selected date responds in the very same click task.
  const snapshotCards=nodes=>{
    if(reduce.matches)return null;
    const view=history.getBoundingClientRect();
    const cards=Array.from(nodes).filter(visibleInList).map(node=>({node,rect:node.getBoundingClientRect()}));
    const layer=document.createElement('div');
    layer.setAttribute('aria-hidden','true');
    layer.inert=true;
    layer.className='history-outgoing-layer';
    Object.assign(layer.style,{position:'fixed',left:`${view.left}px`,top:`${view.top}px`,width:`${view.width}px`,height:`${view.height}px`,overflow:'hidden',pointerEvents:'none',zIndex:'2'});
    for(const {node,rect} of cards){
      const clone=node.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(child=>child.removeAttribute('id'));
      clone.classList.remove('history-row-pending');
      Object.assign(clone.style,{position:'absolute',margin:'0',left:`${rect.left-view.left}px`,top:`${rect.top-view.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,boxSizing:'border-box',animation:'none'});
      layer.append(clone);
    }
    return layer;
  };
  const fold=(nodes)=>{
    const visible=Array.from(nodes).filter(visibleInList);
    return awaitMotion(visible.map((node,i)=>motion(node,
      [{clipPath:getComputedStyle(node).clipPath==='none'?'inset(0 0 0% 0)':getComputedStyle(node).clipPath,opacity:getComputedStyle(node).opacity,translate:getComputedStyle(node).translate},
       {clipPath:'inset(0 0 100% 0)',opacity:0,translate:'0 -4px'}],
      {duration:160,fill:'forwards'})));
  };
  const unfoldDetails=details=>{
    if(!details)return [];
    detailSeen.add(details);
    return [motion(details,[{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0% 0)'}],{duration:400,delay:150,easing:'cubic-bezier(.33,0,.5,1)'}),
      ...Array.from(details.children).filter(visibleInList).map((row,i)=>motion(row,
        [{opacity:0,translate:'0 -12px'},{opacity:1,translate:'0 0'}],
        {duration:280,delay:150+Math.min(i*42,210),easing:'cubic-bezier(.25,.1,.25,1)'}))];
  };
  window.WaterHistoryMotion={
    async transition(dateKey,opening,render){
      if(historyBusy)return;
      const token=historyEpoch;
      historyBusy=true;observer.disconnect();
      history.classList.add('history-motion-managed');
      const source=Array.from(history.querySelectorAll('.history-item-month')).find(row=>row.dataset.dateKey===dateKey);
      if(opening)overviewScroll=history.scrollTop;
      let outgoingLayer=null;
      try {
        const outgoing=opening
          ?Array.from(history.querySelectorAll('.history-item-month')).filter(row=>row!==source)
          :history.querySelectorAll('.history-day-detail-row');
        if(token!==historyEpoch||!armed)return;
        const sourceRect=source?.isConnected?source.getBoundingClientRect():null;
        const normalBorder=opening&&source?getComputedStyle(source).borderColor:'rgb(221, 221, 221)';
        outgoingLayer=snapshotCards(outgoing);
        // This entire layout change and every first keyframe happen in one
        // task. Never paint the newly rebuilt DOM in its unanimated state.
        render();
        history.scrollTop=opening?0:overviewScroll;
        paintHistoryHeading();
        if(outgoingLayer)history.append(outgoingLayer);
        const outgoingFinished=outgoingLayer?fold(outgoingLayer.children).finally(()=>outgoingLayer.remove()):Promise.resolve();
        const target=Array.from(history.querySelectorAll('.history-item-month')).find(row=>row.dataset.dateKey===dateKey);
        const animations=[];
        if(target&&sourceRect){
          const rect=target.getBoundingClientRect();
          const from=`translate(${sourceRect.left-rect.left}px,${sourceRect.top-rect.top}px)`;
          const selectedBorder='rgb(85, 85, 85)';
          animations.push(motion(target,opening?[
            {transform:from,borderColor:normalBorder,easing:'ease-out'},
            {transform:from,borderColor:selectedBorder,offset:.18,easing:ease},
            {transform:'translate(0,0)',borderColor:selectedBorder}
          ]:[
            {transform:from,borderColor:selectedBorder,easing:ease},
            {transform:'translate(0,0)',borderColor:selectedBorder,offset:.8,easing:'ease-in-out'},
            {transform:'translate(0,0)',borderColor:normalBorder}
          ],{duration:340,easing:'linear'}));
        }
        if(opening){
          animations.push(...unfoldDetails(history.querySelector('.history-day-details')));
        }else{
          let index=0;
          history.querySelectorAll('.history-item-month').forEach(row=>{
            if(!visibleInList(row))return;
            seen.add(row.dataset.dateKey);
            if(row===target)return;
            animations.push(motion(row,
              [{clipPath:'inset(0 0 100% 0)',opacity:0},{clipPath:'inset(0 0 0% 0)',opacity:1}],
              {duration:240,delay:Math.min(index++*12,48)}));
          });
        }
        await Promise.all([awaitMotion(animations),outgoingFinished]);
      }finally{
        outgoingLayer?.remove();
        if(token===historyEpoch){
          historyBusy=false;history.classList.remove('history-motion-managed');observeRows();
        }
      }
    },
    close(){
      if(closePromise)return closePromise;
      ++historyEpoch;historyBusy=true;observer.disconnect();
      history.classList.add('history-motion-managed');
      closePromise=fold(history.querySelectorAll('.history-item-month:not(.is-collapsed-sibling),.history-day-detail-row'))
        .finally(()=>{armed=false;history.style.visibility='hidden';historyBusy=false;closePromise=null;history.classList.remove('history-motion-managed');});
      return closePromise;
    }
  };
  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.channel !== 'water-editor') return;
    if (event.data.action === 'browse-open') { ++historyEpoch;historyBusy=false;history.classList.remove('history-motion-managed');armed = false; seen.clear(); observer.disconnect(); stop(); history.style.visibility='hidden'; }
    if (event.data.action === 'browse-revealing' || event.data.action === 'browse-entered') {
      if(armed)return;
      armed = true; paintHistoryHeading(); observeRows(); history.style.visibility='';
    }
  });

  // The amount visibly travels from quick entry to the classification step.
  let amountOrigin = null;
  document.addEventListener('click', event => {
    if (event.target.closest('#quickExpenseContinueBtn') && document.body.classList.contains('quick-expense-mode')) {
      amountOrigin = document.querySelector('#remainingBudget').getBoundingClientRect();
    }
  }, true);
  let previousMode = document.body.dataset.mode;
  new MutationObserver(() => {
    const mode = document.body.dataset.mode;
    if (mode === previousMode) return;
    previousMode = mode;
    if (mode !== 'record') return;
    // Mutation observers run before paint: install the first frame now, not
    // after the new layout has already appeared for one frame.
    {
      const amount = document.querySelector('.record-amount-field');
      const to = amount.getBoundingClientRect();
      if (amountOrigin && to.width && to.height) {
        const from = amountOrigin;
        motion(amount, [
          { translate: `${from.x + from.width / 2 - to.x - to.width / 2}px ${from.y + from.height / 2 - to.y - to.height / 2}px`, scale: '1.12', opacity: 1 },
          { translate: '0 0', scale: '1', opacity: 1 }
        ], { duration: 480 });
      }
      amountOrigin = null;
      for(const field of document.querySelectorAll('.record-time-field,.record-category-field')) {
        motion(field,[{opacity:0,translate:'0 6px'},{opacity:1,translate:'0 0'}],{duration:180,delay:240});
      }
      unfoldCategories();
      motion(document.querySelector('.record-action-dock'), [{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { delay: 110 });
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['data-mode'] });
}

const settings = document.querySelector('#settingsPage');
if (settings) {
  scrollTitle(settings,settings.querySelector('h2'),document.querySelector('#settingsBack'));
  let entryProgress=0;
  const paintSettings=()=>{
    const p=reduce.matches?1:entryProgress;
    settings.querySelectorAll('.settings-section').forEach(section=>{
      const scale=reduce.matches?1:1-.04*(1-p);
      section.style.transformOrigin='left top';
      section.style.scale=String(scale);
      section.style.translate=`0 ${reduce.matches?0:22*(1-p)}px`;
    });
    maskHeadingContent(settings,settings.querySelector('.water-scroll-heading'));
  };
  window.WaterMotion={settingsProgress(p){if(p===entryProgress)return;entryProgress=p;paintSettings();}};
  reduce.addEventListener('change',paintSettings);
  addEventListener('resize',paintSettings);
  for (const page of [document.querySelector('#loginPage')]) {
    scrollTitle(page,page.querySelector('h2'),document.querySelector('#loginBack'));
  }
}

// Each leaf rotates about the shared hub, from a folded stack to its own
// angle. Real controls stay in place; visual copies never receive input.
let clearCategoryFan=()=>{};
function unfoldCategories(){
  const wheel=document.querySelector('#purposeOptions');
  if(!wheel||document.body.dataset.mode!=='record')return;
  clearCategoryFan();
  if(reduce.matches||document.hidden)return;
  const buttons=Array.from(wheel.querySelectorAll('.category-segment'));
  const dividers=Array.from(wheel.querySelectorAll('.category-divider'));
  const layer=document.createElement('div');
  layer.className='category-fan-leaves';
  layer.setAttribute('aria-hidden','true');layer.inert=true;
  Object.assign(layer.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'4'});
  const animations=[];
  const turnDuration=Math.max(24,Math.min(85,280/Math.max(1,buttons.length)));
  const settleDuration=12;
  const totalDuration=buttons.length*turnDuration+Math.max(0,buttons.length-1)*settleDuration;
  buttons.forEach((button,i)=>{
    const leaf=document.createElement('div');
    Object.assign(leaf.style,{position:'absolute',inset:'0',transformOrigin:'50% 50%'});
    const center=Math.atan2(parseFloat(button.style.top)-50,parseFloat(button.style.left)-50);
    const half=Math.PI/buttons.length;
    const point=angle=>`${50+49.7*Math.cos(angle)} ${50+49.7*Math.sin(angle)}`;
    const arc=document.createElementNS('http://www.w3.org/2000/svg','svg');
    arc.setAttribute('viewBox','0 0 100 100');
    Object.assign(arc.style,{position:'absolute',inset:'0',width:'100%',height:'100%',overflow:'visible'});
    const path=document.createElementNS(arc.namespaceURI,'path');
    path.setAttribute('d',buttons.length===1?'M 50 .3 A 49.7 49.7 0 1 1 49.99 .3':`M ${point(center-half)} A 49.7 49.7 0 ${half>Math.PI/2?1:0} 1 ${point(center+half)}`);
    path.setAttribute('fill','none');path.setAttribute('stroke','var(--category-divider)');path.setAttribute('stroke-width','.3');path.setAttribute('opacity','.68');
    arc.append(path);leaf.append(arc);
    for(const node of [dividers[i],button].filter(Boolean)){
      const copy=node.cloneNode(true);copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach(child=>child.removeAttribute('id'));
      copy.style.animation='none';leaf.append(copy);
    }
    if(i===0&&buttons.length>1){
      const leadingEdge=dividers.at(-1).cloneNode(true);
      leadingEdge.classList.add('category-fan-leading-edge');
      leadingEdge.style.animation='none';leaf.append(leadingEdge);
    }
    layer.append(leaf);
    animations.push(motion(leaf,[
      {transform:`rotate(${i===0?-24:-360/buttons.length}deg)`,opacity:0,easing:'cubic-bezier(.16,1,.3,1)'},
      {transform:'rotate(0deg)',opacity:1,offset:.85},
      {transform:'rotate(0deg)',opacity:1}
    ],{duration:turnDuration,delay:i*(turnDuration+settleDuration),easing:'linear'}));
  });
  wheel.append(layer);
  wheel.classList.add('category-fan-active');
  for(const node of wheel.querySelectorAll(':scope > .category-options,:scope > .category-dividers')){
    animations.push(motion(node,[{opacity:0},{opacity:0}],{duration:totalDuration,fill:'both'}));
  }
  const cleanup=()=>{animations.forEach(a=>a?.cancel());layer.remove();if(clearCategoryFan===cleanup)wheel.classList.remove('category-fan-active');};
  clearCategoryFan=cleanup;
  Promise.all(animations.filter(Boolean).map(a=>a.finished.catch(()=>{}))).then(cleanup);
}
document.addEventListener('water-category-enter',unfoldCategories);
