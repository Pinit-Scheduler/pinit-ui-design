/* Keep dependency flows intact; give independent tasks meaningful spatial positions. */
taskMapState.independentLayout='priority';
MAP_EXAMPLE.push(
 {id:-7,title:'건강검진 예약',primaryCategory:'health',done:false,previous:[],next:[],importance:8,difficulty:2,due:TODAY},
 {id:-8,title:'개인 프로젝트 회고 작성',primaryCategory:'project',done:false,previous:[],next:[],importance:8,difficulty:5,due:'2026-11-05'},
 {id:-9,title:'서류 파일 정리',primaryCategory:'life',done:false,previous:[],next:[],importance:3,difficulty:2,due:'2026-11-08'},
 {id:-10,title:'공과금 납부',primaryCategory:'life',done:true,previous:[],next:[],importance:5,difficulty:1,due:'2026-10-25'}
);
const buildBeforeRankingV5=PinitTaskMap.buildTaskGraph;
PinitTaskMap.buildTaskGraph=function(input,options={}){return buildBeforeRankingV5(input,{...options,independentLayout:taskMapState.independentLayout,today:TODAY});};
const renderBeforeRankingV5=renderTaskMapV4;
renderTaskMapV4=function(reset=false){
 renderBeforeRankingV5(reset);if(currentView!=='map')return;
 const state=taskMapState,model=state.model,bar=document.querySelector('.map-frame-bar'),flowPicker=document.getElementById('mapGroupV4');
 bar.insertAdjacentHTML('afterbegin','<label class="map-rank-selector"><span class="map-rank-caption">독립 작업</span><select id="mapRankV5" aria-label="연결 없는 작업 배치 기준">'+selectedOptionsV2([['priority','우선순위'],['importance','중요도'],['deadline','마감순']],state.independentLayout)+'</select></label>');
 document.getElementById('mapRankV5').onchange=event=>{state.independentLayout=event.target.value;renderTaskMapV4(true);requestAnimationFrame(focusIndependentMapV5);};
 const independent=model.groups.find(g=>g.independent);
 if(!independent){document.getElementById('mapRankV5').disabled=true;document.getElementById('mapRankV5').title='모든 작업이 시퀀스에 연결되어 있어요.';document.querySelector('.map-summary').insertAdjacentHTML('beforeend','<span class="map-no-independent">모든 작업이 시퀀스에 연결되어 있어요.</span>');}
 else{
  document.querySelector('.map-flow-group.independent')?.classList.add('has-ranking');
  const info=model.independentInfo,world=document.getElementById('mapWorldV4');
  const caption='<div class="map-rank-description" style="left:'+(independent.x+28)+'px;top:'+(independent.y+64)+'px;width:'+(independent.width-56)+'px"><span title="'+esc(info.description)+'">'+esc(info.description)+'</span><button type="button" onclick="openMapRankingHelpV5()">기준 안내</button></div>';
  const axes='<div class="map-rank-axis-x" style="left:'+info.axisX+'px;top:'+info.axisY+'px;width:'+info.axisWidth+'px">'+esc(info.xLabel)+'</div>'+(info.mode==='priority'&&info.yLabel?'<div class="map-rank-axis-y" style="left:'+(independent.x+9)+'px;top:'+(info.axisY+50)+'px">중요도 높음 ↑<span>낮음 ↓</span></div>':'');
  const zones=(model.zones||[]).map(zone=>'<section class="map-rank-zone '+zone.kind+'" style="left:'+zone.x+'px;top:'+zone.y+'px;width:'+zone.width+'px;height:'+zone.height+'px" aria-label="'+esc(zone.title)+' · '+zone.ids.length+'개"><div class="map-zone-head"><h3>'+esc(zone.title)+'</h3><span>'+zone.ids.length+'개</span><p>'+esc(zone.description)+'</p></div>'+(!zone.ids.length?'<p class="map-zone-empty">이 구역의 작업이 없어요.</p>':'')+'</section>').join('');
  world.querySelector('.map-edges').insertAdjacentHTML('beforebegin',caption+axes+zones);
  world.querySelector('.map-rank-description button').addEventListener('pointerdown',event=>event.stopPropagation());
 }
 const sampleButton=document.querySelector('.map-footer .text-btn');if(sampleButton)sampleButton.textContent=state.demo?'내 작업 보기':'배치·연결 예시 보기';
 const sampleNotice=document.querySelector('.map-demo-note');if(sampleNotice)sampleNotice.firstChild.textContent='연결 흐름과 독립 작업의 배치를 살펴보는 예시입니다. 내 작업에는 저장되지 않아요.';
 if(flowPicker&&independent)flowPicker.querySelector('[value="independent"]').textContent=independent.title+' ('+independent.ids.length+'개)';
};
function focusIndependentMapV5(){if(currentView!=='map')return;const group=taskMapState.model.groups.find(g=>g.independent);if(!group)return;focusMapBoundsV4(group);document.getElementById('mapGroupV4').value='independent';}
function openMapRankingHelpV5(){const mode=taskMapState.independentLayout,title={priority:'우선순위 지도 기준',importance:'중요도 지도 기준',deadline:'마감순 지도 기준'}[mode],copy={priority:'중요도 7–9는 위쪽, 1–6은 아래쪽에 둡니다. 오늘부터 2일 이내 마감이거나 이미 기한이 지난 작업은 왼쪽, 그 이후이거나 마감이 없는 작업은 오른쪽에 둡니다.',importance:'중요도 7–9, 4–6, 1–3 구역을 왼쪽부터 표시합니다. 같은 구역 안에서는 중요도가 높은 순, 중요도가 같으면 마감이 빠른 순으로 놓습니다.',deadline:'마감 날짜가 빠른 구역부터 왼쪽에 놓습니다. 같은 날짜 안에서는 중요도가 높은 순입니다. 날짜 구역의 간격은 같으며 실제 남은 기간의 비율을 나타내지는 않습니다.'}[mode];modal(modalHead(title)+'<p>'+copy+'</p><div class="notice">이 배치는 연결 없는 작업의 위치를 정하는 기준입니다. 연결된 시퀀스의 순서, 기존 중요도·마감 값과 완료 상태는 바꾸지 않습니다. 완료한 독립 작업은 별도 구역에 둡니다.</div><div class="dialog-actions"><button class="btn primary" onclick="closeModal()">확인</button></div>');}
const openNodeBeforeRankingV5=openTaskMapNodeV4;
openTaskMapNodeV4=function(id){openNodeBeforeRankingV5(id);if(taskMapState.demo){const notice=document.querySelector('.dialog .notice');if(notice)notice.textContent='연결된 작업은 순서를 보여주고, 연결 없는 작업은 선택한 기준에 따라 배치하는 예시입니다. 실제 작업에는 저장되지 않습니다.';}};
