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
  return {orientation,nodes,edges:routes,groups,width,height,missingEdges,cycleCount};
 }
 function zoomAt(view,scale,point){const worldX=(point.x-view.x)/view.scale,worldY=(point.y-view.y)/view.scale;return {scale,x:point.x-worldX*scale,y:point.y-worldY*scale};}
 function fitBounds(bounds,viewport,padding=30,maxScale=1){if(!bounds.width||!bounds.height)return {x:padding,y:padding,scale:1};const scale=Math.max(.0001,Math.min(maxScale,Math.max(1,viewport.width-padding*2)/bounds.width,Math.max(1,viewport.height-padding*2)/bounds.height));return {scale,x:(viewport.width-bounds.width*scale)/2-(bounds.x||0)*scale,y:(viewport.height-bounds.height*scale)/2-(bounds.y||0)*scale};}
 const api={buildTaskGraph,zoomAt,fitBounds,NODE_W,NODE_H};root.PinitTaskMap=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
