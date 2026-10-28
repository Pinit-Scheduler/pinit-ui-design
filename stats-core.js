(function(root){
 const DAY=86400000,key=d=>new Date(d).toISOString().slice(0,10),minutes=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
 function summarize(records,options={}){const anchor=new Date(options.today+'T00:00:00Z'),mode=options.mode||'week',offset=Number(options.offset)||0;let start,end;
  if(mode==='month'){start=Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth()+offset,1);end=Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth()+offset+1,1);}else{const shift=(anchor.getUTCDay()-(options.weekStart??1)+7)%7;start=anchor.getTime()-shift*DAY+offset*7*DAY;end=start+7*DAY;}
  const days=[];for(let time=start;time<end;time+=DAY)days.push({date:key(time),planned:0,completed:0,count:0});const byDate=new Map(days.map(d=>[d.date,d])),selected=records.filter(s=>byDate.has(s.date)&&(mode!=='recurrence'||Boolean(s.repeat))),states={NOT_STARTED:0,IN_PROGRESS:0,SUSPENDED:0,COMPLETED:0,OTHER:0},categoryMap=new Map(),types={};let completedMinutes=0,completedCount=0;
  for(const s of selected){const state=Object.prototype.hasOwnProperty.call(states,s.state)?s.state:'OTHER',d=byDate.get(s.date),duration=minutes(s.duration);states[state]++;d.planned+=duration;if(state==='COMPLETED'){types[s.type||'OTHER']=(types[s.type||'OTHER']||0)+duration;d.completed+=duration;d.count++;completedMinutes+=duration;completedCount++;const category=s.statsCategory||'없음';categoryMap.set(category,(categoryMap.get(category)||0)+duration);}}
  return {types,start:key(start),end:key(end-DAY),days,states,categories:[...categoryMap].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)),total:selected.length,completedCount,completedMinutes,plannedMinutes:days.reduce((n,d)=>n+d.planned,0)};
 }
 const api={summarize};root.PinitStats=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
