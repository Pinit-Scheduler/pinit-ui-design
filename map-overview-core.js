(function(root){
 function compact(model,options={}){const mobile=Boolean(options.mobile),W=244,H=140,nodes=[],groups=[];let top=12;
  for(const source of model.groups){const members=model.nodes.filter(n=>n.groupId===source.id),pad=mobile?8:12,header=mobile?0:28;let width,height;
   if(source.independent){const columns=mobile?1:Math.min(3,members.length),rows=Math.ceil(members.length/columns),gapX=16,gapY=mobile?30:14;width=pad*2+columns*W+(columns-1)*gapX;height=header+pad*2+rows*H+(rows-1)*gapY;members.forEach((node,i)=>nodes.push({...node,x:12+pad+i%columns*(W+gapX),y:top+header+pad+Math.floor(i/columns)*(H+gapY),width:W,height:H}));}
   else{const ranks=[...new Set(members.map(n=>n.rank))].sort((a,b)=>a-b),layers=ranks.map(rank=>members.filter(n=>n.rank===rank)),rows=Math.max(...layers.map(l=>l.length));width=pad*2+(mobile?rows*W+(rows-1)*20:layers.length*W+(layers.length-1)*48);height=header+pad*2+(mobile?layers.length*H+(layers.length-1)*30:rows*H+(rows-1)*14);layers.forEach((layer,rank)=>layer.forEach((node,i)=>nodes.push({...node,x:12+pad+(mobile?(i+(rows-layer.length)/2)*(W+20):rank*(W+48)),y:top+header+pad+(mobile?rank*(H+30):(i+(rows-layer.length)/2)*(H+14)),width:W,height:H})));}
   groups.push({...source,x:12,y:top,width,height});top+=height+12;
  }
  const byId=new Map(nodes.map(n=>[n.id,n]));return {...model,nodes,groups,edges:model.edges.map(e=>({...e,source:byId.get(e.from),target:byId.get(e.to)})),width:groups.length?Math.max(...groups.map(g=>g.x+g.width))+12:0,height:groups.length?top:0};
 }
 const api={compact};root.PinitMapOverview=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
