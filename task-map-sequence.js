/* One sequence map; mobile follows the same connections from top to bottom. */
paths.chevronLeft='<path d="m15 6-6 6 6 6"/>';
paths.chevronRight='<path d="m9 6 6 6-6 6"/>';
taskMapState.orientation='horizontal';
taskMapState.sequenceSort='priority';
function sequenceMobileV9(){return matchMedia('(max-width:760px)').matches;}
const buildBeforeSequenceV9=PinitTaskMap.buildTaskGraph;
PinitTaskMap.buildTaskGraph=function(input,options={}){
 const mode=taskMapState.sequenceSort,today=PinitTaskMap.dayNumber(TODAY),due=t=>PinitTaskMap.dayNumber(t.due),weight=t=>mode==='deadline'?due(t):mode==='importance'?-(Number(t.importance)||0):(Number(t.importance)>=7?0:2)+(due(t)<=today+2?0:1);
 const ordered=[...input].sort((a,b)=>Number(a.done)-Number(b.done)||weight(a)-weight(b)||(Number(b.importance)||0)-(Number(a.importance)||0)||due(a)-due(b));
 const model=buildBeforeSequenceV9(ordered,{...options,orientation:sequenceMobileV9()?'vertical':'horizontal'});
 const group=model.groups.find(g=>g.independent);
 if(sequenceMobileV9()&&group){group.width=336;group.height=114+group.ids.length*222;group.ids.forEach((id,i)=>{const node=model.nodes.find(n=>n.id===id);node.x=group.x+28;node.y=group.y+86+i*222;});model.width=Math.max(...model.groups.map(g=>g.x+g.width))+28;model.height=group.y+group.height+28;}
 return model;
};
const edgeBeforeSequenceV9=mapEdgePathV4;
mapEdgePathV4=function(edge){if(!sequenceMobileV9()||edge.from===edge.to)return edgeBeforeSequenceV9(edge);const a=edge.source,b=edge.target,x1=a.x+a.width/2,y1=a.y+a.height,x2=b.x+b.width/2,y2=b.y;return 'M '+x1+' '+y1+' C '+x1+' '+(y1+(y2-y1)/2)+', '+x2+' '+(y1+(y2-y1)/2)+', '+x2+' '+y2;};
const fitBeforeSequenceV9=fitTaskMapV4;
function focusSequenceNodeV9(node){if(!node)return;const viewport=document.getElementById('mapViewportV4'),scale=sequenceMobileV9()?1:Math.min(1.1,Math.max(.9,taskMapState.view.scale));taskMapState.view={scale,x:viewport.clientWidth/2-(node.x+node.width/2)*scale,y:86-node.y*scale};applyTaskMapViewV4();updateSequencePositionV9(node.id);}
fitTaskMapV4=function(){if(!sequenceMobileV9())return fitBeforeSequenceV9();const nodes=taskMapState.model.nodes;focusSequenceNodeV9(nodes.find(n=>!n.task.done)||nodes[0]);};
function updateSequencePositionV9(id){const nodes=taskMapState.model.nodes,index=Math.max(0,nodes.findIndex(n=>n.id===id)),label=document.getElementById('sequencePositionV9');taskMapState.sequenceIndex=index;if(label)label.textContent=nodes.length?(index+1)+' / '+nodes.length+' 작업':'작업 없음';document.getElementById('sequencePrevV9')?.toggleAttribute('disabled',index===0);document.getElementById('sequenceNextV9')?.toggleAttribute('disabled',index>=nodes.length-1);}
const renderBeforeSequenceV9=renderTaskMapV4;
renderTaskMapV4=function(reset=false){taskMapState.orientation='horizontal';renderBeforeSequenceV9(reset);if(currentView!=='map')return;const frame=document.getElementById('mapFrameV4');frame.classList.add('sequence-only');document.querySelector('.map-orientation')?.remove();
 frame.insertAdjacentHTML('beforeend','<div class="sequence-reading-nav"><button id="sequencePrevV9" aria-label="이전 작업으로 이동">'+icon('chevronLeft')+'이전</button><span id="sequencePositionV9" aria-live="polite"></span><button id="sequenceNextV9" aria-label="다음 작업으로 이동">다음'+icon('chevronRight')+'</button></div>');
 document.querySelector('.map-frame-bar').insertAdjacentHTML('afterbegin','<label class="sequence-sort"><select id="sequenceSortV9" aria-label="독립 작업 정렬 기준">'+selectedOptionsV2([['priority','우선순위'],['importance','중요도'],['deadline','마감순']],taskMapState.sequenceSort)+'</select></label>');
 document.getElementById('sequenceSortV9').onchange=e=>{taskMapState.sequenceSort=e.target.value;renderTaskMapV4(true);};
 document.getElementById('sequencePrevV9').onclick=()=>focusSequenceNodeV9(taskMapState.model.nodes[Math.max(0,taskMapState.sequenceIndex-1)]);
 document.getElementById('sequenceNextV9').onclick=()=>focusSequenceNodeV9(taskMapState.model.nodes[Math.min(taskMapState.model.nodes.length-1,taskMapState.sequenceIndex+1)]);
 document.getElementById('mapFitV4').onclick=()=>fitBeforeSequenceV9();
 document.getElementById('mapGroupV4').onchange=e=>{if(e.target.value==='all')fitTaskMapV4();else{const group=taskMapState.model.groups.find(g=>g.id===e.target.value);if(sequenceMobileV9())focusSequenceNodeV9(taskMapState.model.nodes.find(n=>n.groupId===group?.id));else if(group)focusMapBoundsV4(group);}};
 document.getElementById('mapHelpV4').textContent=sequenceMobileV9()?'위에서 아래로 이어지는 시퀀스 · 이전/다음으로 작업 이동 · 작업을 누르면 상세':'왼쪽에서 오른쪽으로 이어지는 시퀀스 · 드래그로 이동 · 휠로 확대·축소';
 updateSequencePositionV9(taskMapState.model.nodes[0]?.id);
};
matchMedia('(max-width:760px)').addEventListener('change',()=>{if(currentView==='map')renderTaskMapV4(true);});
