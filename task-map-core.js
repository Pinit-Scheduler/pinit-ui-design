/* Dependency graph layout, kept separate from the UI so branches and merges can be verified. */
(function(root){
 'use strict';
 const NODE_W=280,NODE_H=182,PAD=28,HEADER=58;
 function buildTaskGraph(input,options={}){
  const orientation=options.orientation==='vertical'?'vertical':'horizontal';
  const records=new Map();
  for(const task of input||[])if(task&&task.id!==undefined&&!records.has(String(task.id)))records.set(String(task.id),task);
  const edges=[],seen=new Set();let missingEdges=0;
  function connect(from,to){from=String(from);to=String(to);const key=JSON.stringify([from,to]);if(seen.has(key))return;seen.add(key);if(!records.has(from)||!records.has(to)){missingEdges++;return;}edges.push({from,to});}
  records.forEach((t,id)=>{for(const p of t.previous||[])connect(p,id);for(const n of t.next||[])connect(id,n);});
  const neighbors=new Map([...records.keys()].map(id=>[id,new Set()]));
  for(const e of edges){neighbors.get(e.from).add(e.to);neighbors.get(e.to).add(e.from);}
  const components=[],visited=new Set();
  for(const id of records.keys()){
   if(visited.has(id))continue;const ids=[],queue=[id];visited.add(id);
   for(let i=0;i<queue.length;i++){const key=queue[i];ids.push(key);for(const next of neighbors.get(key))if(!visited.has(next)){visited.add(next);queue.push(next);}}
   components.push(ids);
  }
  const connected=components.filter(c=>c.length>1||edges.some(e=>e.from===c[0]&&e.to===c[0])).sort((a,b)=>b.length-a.length);
  const alone=components.filter(c=>c.length===1&&!neighbors.get(c[0]).size).flat();
  const groups=[],nodes=[],positions=new Map();let top=28,cycleCount=0;
  function addNode(id,x,y,groupId,rank){const node={id,task:records.get(id),x,y,width:NODE_W,height:NODE_H,groupId,rank};nodes.push(node);positions.set(id,node);}
  for(const ids of connected){
   const membership=new Set(ids),local=edges.filter(e=>membership.has(e.from)&&membership.has(e.to));
   const incoming=new Map(ids.map(id=>[id,0])),children=new Map(ids.map(id=>[id,[]])),parents=new Map(ids.map(id=>[id,[]])),ranks=new Map(ids.map(id=>[id,0]));
   for(const e of local){incoming.set(e.to,incoming.get(e.to)+1);children.get(e.from).push(e.to);parents.get(e.to).push(e.from);}
   const roots=ids.filter(id=>incoming.get(id)===0),queue=[...roots],processed=new Set();
   for(let i=0;i<queue.length;i++){const id=queue[i];processed.add(id);for(const next of children.get(id)){ranks.set(next,Math.max(ranks.get(next),ranks.get(id)+1));incoming.set(next,incoming.get(next)-1);if(incoming.get(next)===0)queue.push(next);}}
   const cyclic=ids.filter(id=>!processed.has(id));cycleCount+=cyclic.length;
   if(cyclic.length){const last=processed.size?Math.max(0,...[...processed].map(id=>ranks.get(id)))+1:0;cyclic.forEach(id=>ranks.set(id,last));}
   const layers=[];ids.forEach(id=>{const rank=ranks.get(id);(layers[rank]||(layers[rank]=[])).push(id);});
   const order=new Map();layers.forEach(layer=>{layer.sort((a,b)=>{const mean=id=>{const p=parents.get(id).filter(p=>order.has(p));return p.length?p.reduce((sum,p)=>sum+order.get(p),0)/p.length:ids.indexOf(id);};return mean(a)-mean(b);});layer.forEach((id,i)=>order.set(id,i));});
   const maxRows=Math.max(...Array.from(layers,l=>l?.length||0)),count=layers.length,id='flow-'+ids[0];
   const width=orientation==='horizontal'?PAD*2+count*NODE_W+(count-1)*88:PAD*2+maxRows*NODE_W+(maxRows-1)*32;
   const height=orientation==='horizontal'?HEADER+PAD*2+maxRows*NODE_H+(maxRows-1)*30:HEADER+PAD*2+count*NODE_H+(count-1)*84;
   const first=records.get(roots[0]||ids[0]),title=roots.length<=1?first.title:'이어지는 작업';
   const group={id,title,ids:[...ids],x:28,y:top,width,height,done:ids.filter(key=>records.get(key).done).length,cyclic:cyclic.length>0};groups.push(group);
   layers.forEach((layer,rank)=>{const offset=(maxRows-layer.length)/2;layer.forEach((key,row)=>{const x=orientation==='horizontal'?group.x+PAD+rank*(NODE_W+88):group.x+PAD+(row+offset)*(NODE_W+32);const y=orientation==='horizontal'?top+HEADER+PAD+(row+offset)*(NODE_H+30):top+HEADER+PAD+rank*(NODE_H+84);addNode(key,x,y,id,rank);});});
   top+=height+28;
  }
  if(alone.length){const cols=Math.min(3,alone.length),rows=Math.ceil(alone.length/cols),group={id:'independent',title:'연결되지 않은 작업',ids:alone,x:28,y:top,width:PAD*2+cols*NODE_W+(cols-1)*32,height:HEADER+PAD*2+rows*NODE_H+(rows-1)*30,done:alone.filter(key=>records.get(key).done).length,independent:true};groups.push(group);alone.forEach((id,i)=>addNode(id,group.x+PAD+(i%cols)*(NODE_W+32),top+HEADER+PAD+Math.floor(i/cols)*(NODE_H+30),group.id,0));top+=group.height+28;}
  const width=groups.length?Math.max(...groups.map(g=>g.x+g.width))+28:0,height=groups.length?top:0;
  const routes=edges.map(e=>({...e,source:positions.get(e.from),target:positions.get(e.to)}));
  const model={orientation,nodes,edges:routes,groups,width,height,missingEdges,cycleCount};
  if(options.orientation==='network')return layoutNetworkTasks(model,options);
  return options.independentLayout?layoutIndependentTasks(model,options):model;
 }
 function layoutNetworkTasks(model,options={}){
  const mode=options.independentLayout||'priority',today=dayNumber(options.today||'2026-10-28'),incoming=new Map(model.nodes.map(n=>[n.id,0])),children=new Map(model.nodes.map(n=>[n.id,[]]));
  model.edges.forEach(e=>{incoming.set(e.to,incoming.get(e.to)+1);children.get(e.from).push(e.to);});
  const weight=n=>mode==='deadline'?dayNumber(n.task.due):mode==='importance'?-(Number(n.task.importance)||0):(Number(n.task.importance)>=7?0:2)+(dayNumber(n.task.due)<=today+2?0:1);
  const compare=(a,b)=>Number(a.task.done)-Number(b.task.done)||weight(a)-weight(b)||(Number(b.task.importance)||0)-(Number(a.task.importance)||0)||dayNumber(a.task.due)-dayNumber(b.task.due)||a.id.localeCompare(b.id);
  const byOriginal=new Map(model.nodes.map(n=>[n.id,n])),ready=model.nodes.filter(n=>!incoming.get(n.id)).sort(compare),ordered=[],seen=new Set();
  while(ready.length){const n=ready.shift();ordered.push(n);seen.add(n.id);for(const id of children.get(n.id)){incoming.set(id,incoming.get(id)-1);if(!incoming.get(id)){ready.push(byOriginal.get(id));}ready.sort((a,b)=>Number(!children.get(n.id).includes(a.id))-Number(!children.get(n.id).includes(b.id))||compare(a,b));}}
  ordered.push(...model.nodes.filter(n=>!seen.has(n.id)).sort(compare));
  const cols=Math.min(4,ordered.length),nodes=ordered.map((n,i)=>{const row=Math.floor(i/cols),col=i%cols;return {...n,x:70+(row%2?cols-1-col:col)*320,y:120+row*280,width:210,height:220,groupId:'all-tasks',order:i+1};}),byId=new Map(nodes.map(n=>[n.id,n]));
  const width=nodes.length?cols*320+40:0,height=nodes.length?Math.ceil(nodes.length/cols)*280+120:0;
  const groups=nodes.length?[{id:'all-tasks',title:'전체 작업 · '+({priority:'우선순위',importance:'중요도',deadline:'마감순'})[mode]+' 추천 순서',ids:nodes.map(n=>n.id),x:40,y:40,width:width-80,height:height-80,done:nodes.filter(n=>n.task.done).length}]:[];
  const existing=new Set(model.edges.map(e=>JSON.stringify([e.from,e.to]))),orderEdges=[];
  for(let i=1;i<nodes.length;i++){const source=nodes[i-1],target=nodes[i];if(!source.task.done&&!target.task.done&&!existing.has(JSON.stringify([source.id,target.id])))orderEdges.push({from:source.id,to:target.id,source,target});}
  return {...model,orientation:'network',nodes,groups,edges:model.edges.map(e=>({...e,source:byId.get(e.from),target:byId.get(e.to)})),orderEdges,width,height,zones:[],independentInfo:null};
 }
 function layoutExecutionTasks(model){
  const active=model.nodes.filter(n=>!n.task.done),completed=model.nodes.filter(n=>n.task.done),cols=Math.min(3,Math.max(1,active.length)),rows=Math.ceil(active.length/cols),position=(n,i,done=false)=>{const row=Math.floor(i/cols),col=row%2?cols-1-i%cols:i%cols;return {...n,x:90+col*330,y:170+(done?rows*310+90:0)+row*310,width:240,height:250};},nodes=[...active.map((n,i)=>position(n,i)),...completed.map((n,i)=>position(n,i,true))],byId=new Map(nodes.map(n=>[n.id,n])),route=e=>({...e,source:byId.get(e.from),target:byId.get(e.to)});
  return {...model,nodes,edges:model.edges.map(route),orderEdges:(model.orderEdges||[]).filter(e=>!e.source.task.done&&!e.target.task.done).map(route),width:nodes.length?Math.max(...nodes.map(n=>n.x+n.width))+90:0,height:nodes.length?Math.max(...nodes.map(n=>n.y+n.height))+80:0};
 }
 function dayNumber(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return Infinity;const time=Date.parse(value+'T00:00:00Z');return Number.isFinite(time)?Math.floor(time/86400000):Infinity;}
 function layoutIndependentTasks(model,options={}){
  const original=model.groups.find(g=>g.independent);if(!original)return {...model,zones:[],independentInfo:null};
  const mode=['priority','importance','deadline'].includes(options.independentLayout)?options.independentLayout:'priority',today=dayNumber(options.today||'2026-10-28');
  const records=original.ids.map(id=>model.nodes.find(n=>n.id===id)),active=records.filter(n=>!n.task.done),completed=records.filter(n=>n.task.done),zones=[],replacements=new Map();
  const zonePad=16,zoneHeader=58,gap=20,top=original.y+HEADER+60,left=original.x+PAD+30;
  const order=(a,b)=>(Number(b.task.importance)||0)-(Number(a.task.importance)||0)||dayNumber(a.task.due)-dayNumber(b.task.due)||a.id.localeCompare(b.id);
  function zone(id,title,description,items,x,y,width,height,columns=1,kind='normal'){
   const sorted=[...items].sort(order),rows=Math.max(1,Math.ceil(sorted.length/columns)),minHeight=zoneHeader+zonePad+rows*NODE_H+(rows-1)*20;
   const actualHeight=Math.max(height||0,sorted.length?minHeight:114);
   zones.push({id,title,description,ids:sorted.map(n=>n.id),x,y,width,height:actualHeight,kind});
   sorted.forEach((node,i)=>replacements.set(node.id,{...node,x:x+zonePad+(i%columns)*(NODE_W+20),y:y+zoneHeader+Math.floor(i/columns)*(NODE_H+20),rank:0,zoneId:id}));
   return actualHeight;
  }
  let width=0,height=0,info;
  if(mode==='priority'&&active.length){
   const buckets=[[],[],[],[]];active.forEach(n=>{const high=Number(n.task.importance)>=7,urgent=dayNumber(n.task.due)<=today+2;buckets[(high?0:2)+(urgent?0:1)].push(n);});
   const columns=Math.min(2,Math.max(1,Math.ceil(Math.sqrt(Math.max(...buckets.map(b=>b.length))))));
   const zoneWidth=zonePad*2+columns*NODE_W+(columns-1)*20,rowHeight=row=>Math.max(...buckets.slice(row*2,row*2+2).map(b=>b.length?zoneHeader+zonePad+Math.ceil(b.length/columns)*NODE_H+(Math.ceil(b.length/columns)-1)*20:114));
   const firstHeight=rowHeight(0),secondHeight=rowHeight(1),matrixWidth=zoneWidth*2+gap,matrixHeight=firstHeight+gap+secondHeight;
   const labels=[['focus','중요하고 임박함','중요도 7–9 · 마감 2일 이내'],['important-later','중요하지만 여유 있음','중요도 7–9 · 그 이후 또는 기한 없음'],['urgent','마감이 가까움','중요도 1–6 · 마감 2일 이내'],['later','여유 있게 진행','중요도 1–6 · 그 이후 또는 기한 없음']];
   labels.forEach((label,i)=>zone('priority-'+i,label[1],label[2],buckets[i],left+(i%2)*(zoneWidth+gap),top+(i<2?0:firstHeight+gap),zoneWidth,i<2?firstHeight:secondHeight,columns,['focus','plan','due','later'][i]));
   if(completed.length)zone('completed','완료한 작업','우선순위 판단에서 분리',completed,left+matrixWidth+gap,top,zonePad*2+NODE_W,0,1,'completed');
   width=PAD+30+matrixWidth+(completed.length?gap+zonePad*2+NODE_W:0)+PAD;
   height=HEADER+60+Math.max(matrixHeight,...zones.filter(z=>z.kind==='completed').map(z=>z.height))+PAD;
   info={mode,title:'우선순위로 보는 독립 작업',description:'연결 없는 작업을 중요도와 마감의 가까움으로 배치합니다. 지난 마감도 임박 구역에 포함합니다.',xLabel:'마감 2일 이내 ← → 그 이후 / 기한 없음',yLabel:'높은 중요도 ↑',axisX:left,axisY:top-24,axisWidth:matrixWidth};
  }else{
   let bands=[];
   if(mode==='importance')bands=[{id:'high',title:'높은 중요도',description:'7–9 · 높은 값부터',items:active.filter(n=>n.task.importance>=7)},{id:'medium',title:'보통 중요도',description:'4–6 · 높은 값부터',items:active.filter(n=>n.task.importance>=4&&n.task.importance<=6)},{id:'low',title:'낮은 중요도',description:'1–3 · 높은 값부터',items:active.filter(n=>n.task.importance<=3)}];
   else if(mode==='deadline'){
    const dateGroups=new Map();active.forEach(n=>{const key=Number.isFinite(dayNumber(n.task.due))?n.task.due:'none';if(!dateGroups.has(key))dateGroups.set(key,[]);dateGroups.get(key).push(n);});
    bands=[...dateGroups].sort(([a],[b])=>dayNumber(a)-dayNumber(b)||(a==='none'?1:b==='none'?-1:0)).map(([date,items])=>({id:'date-'+date,title:date==='none'?'마감 없음':date===options.today?'오늘 마감':date.slice(5).replace('-','/')+' 마감',description:date==='none'?'기한이 지정되지 않은 작업':dayNumber(date)<today?'마감이 지난 작업':'같은 날은 중요도 높은 순',items}));
   }else bands=[{id:'open',title:'진행할 작업 없음',description:'모든 독립 작업을 완료했어요.',items:[]}];
   if(completed.length)bands.push({id:'completed',title:'완료한 작업',description:'열린 작업과 분리해 표시',items:completed,kind:'completed'});
   const zoneWidth=zonePad*2+NODE_W;
   bands.forEach((band,i)=>zone(band.id,band.title,band.description,band.items,left+i*(zoneWidth+gap),top,zoneWidth,0,1,band.kind||mode));
   width=PAD+30+Math.max(1,bands.length)*zoneWidth+Math.max(0,bands.length-1)*gap+PAD;height=HEADER+60+Math.max(114,...zones.map(z=>z.height))+PAD;
   info={mode,title:mode==='importance'?'중요도로 보는 독립 작업':mode==='deadline'?'마감순으로 보는 독립 작업':'완료한 독립 작업',description:mode==='importance'?'왼쪽일수록 중요도가 높습니다. 같은 구역에서는 높은 값부터, 값이 같으면 마감이 빠른 순으로 표시합니다.':mode==='deadline'?'왼쪽부터 마감이 빠른 날짜입니다. 날짜 구역의 간격은 같고, 같은 날짜 안에서는 중요도가 높은 순입니다.':'완료한 작업은 열린 작업과 구분해 보여줍니다.',xLabel:mode==='importance'?'중요도 높음 → 낮음':mode==='deadline'?'마감 빠름 → 늦음':'완료한 작업',axisX:left,axisY:top-24,axisWidth:width-PAD*2-30};
  }
  const group={...original,title:info.title,width,height,layout:mode};
  const nodes=model.nodes.map(n=>replacements.get(n.id)||n),byId=new Map(nodes.map(n=>[n.id,n]));
  return {...model,groups:model.groups.map(g=>g.id===group.id?group:g),nodes,edges:model.edges.map(e=>({...e,source:byId.get(e.from),target:byId.get(e.to)})),width:Math.max(...model.groups.filter(g=>g.id!==group.id).map(g=>g.x+g.width+28),group.x+group.width+28),height:group.y+group.height+28,zones,independentInfo:info};
 }
 function zoomAt(view,scale,point){const worldX=(point.x-view.x)/view.scale,worldY=(point.y-view.y)/view.scale;return {scale,x:point.x-worldX*scale,y:point.y-worldY*scale};}
 function fitBounds(bounds,viewport,padding=30,maxScale=1){if(!bounds.width||!bounds.height)return {x:padding,y:padding,scale:1};const scale=Math.max(.0001,Math.min(maxScale,Math.max(1,viewport.width-padding*2)/bounds.width,Math.max(1,viewport.height-padding*2)/bounds.height));return {scale,x:(viewport.width-bounds.width*scale)/2-(bounds.x||0)*scale,y:(viewport.height-bounds.height*scale)/2-(bounds.y||0)*scale};}
 function layoutForceTasks(model,options={}){
  if(!model.nodes.length)return {...model,force:true};
  const spacing=Number(options.spacing)||1,n=model.nodes.length,points=model.nodes.map((node,i)=>{const angle=i*2.3999632297,r=180*Math.sqrt(i+1)*spacing;return {...node,x:Math.cos(angle)*r,y:Math.sin(angle)*r,width:210,height:195,vx:0,vy:0};}),byId=new Map(points.map(p=>[p.id,p]));
  for(let step=0;step<220;step++){
   const cooling=1-step/250;
   for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const a=points[i],b=points[j],dx=b.x-a.x||.01,dy=b.y-a.y||.01,d=Math.max(30,Math.hypot(dx,dy)),push=Math.min(14,22000*spacing*spacing/(d*d));a.vx-=dx/d*push;b.vx+=dx/d*push;a.vy-=dy/d*push;b.vy+=dy/d*push;}
   for(const edge of model.edges){const a=byId.get(edge.from),b=byId.get(edge.to);if(a===b)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),pull=(d-260*spacing)*.018;a.vx+=dx/d*pull;b.vx-=dx/d*pull;a.vy+=dy/d*pull;b.vy-=dy/d*pull;}
   points.forEach((p,i)=>{p.vx+=((i/Math.max(1,n-1)-.5)*300*spacing-p.x)*.002;p.vy-=p.y*.002;p.vx*=.72;p.vy*=.72;p.x+=p.vx*cooling;p.y+=p.vy*cooling;});
  }
  for(let pass=0;pass<100;pass++){let overlap=false;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const a=points[i],b=points[j],dx=b.x-a.x,dy=b.y-a.y,ox=250-Math.abs(dx),oy=215-Math.abs(dy);if(ox>0&&oy>0){overlap=true;if(ox<oy){const shift=(ox+.1)/2*(dx>=0?1:-1);a.x-=shift;b.x+=shift;}else{const shift=(oy+.1)/2*(dy>=0?1:-1);a.y-=shift;b.y+=shift;}}}if(!overlap)break;}
  const minX=Math.min(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y));points.forEach(p=>{p.x=p.x-minX+90;p.y=p.y-minY+120;delete p.vx;delete p.vy;});
  const width=Math.max(...points.map(p=>p.x+p.width))+140,height=Math.max(...points.map(p=>p.y+p.height))+100;
  const route=e=>({...e,source:byId.get(e.from),target:byId.get(e.to)});
  return {...model,force:true,nodes:points,edges:model.edges.map(route),orderEdges:(model.orderEdges||[]).map(route),width,height,groups:model.groups.map(g=>({...g,x:40,y:40,width:width-80,height:height-80}))};
 }
 const api={buildTaskGraph,layoutIndependentTasks,layoutNetworkTasks,layoutForceTasks,layoutExecutionTasks,dayNumber,zoomAt,fitBounds,NODE_W,NODE_H};root.PinitTaskMap=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
