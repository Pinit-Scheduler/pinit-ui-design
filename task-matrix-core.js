(function(root){
 function day(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return Infinity;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?d.getTime()/86400000:Infinity;}
 function classify(tasks,options={}){const today=day(options.today),days=Number(options.urgentDays??2),threshold=Number(options.importantFrom??7),quadrants=[[],[],[],[]],completed=[];
  for(const task of tasks){if(task.done){completed.push(task);continue;}const important=Number(task.importance)>=threshold,urgent=Number.isFinite(day(task.due))&&day(task.due)<=today+days;quadrants[(important?0:2)+(urgent?0:1)].push(task);}
  const compare=(a,b)=>day(a.due)-day(b.due)||(Number(b.importance)||0)-(Number(a.importance)||0)||String(a.id).localeCompare(String(b.id));quadrants.forEach(q=>q.sort(compare));completed.sort(compare);return {quadrants,completed,total:tasks.length,active:quadrants.reduce((n,q)=>n+q.length,0)};
 }
 const api={day,classify};root.PinitMatrix=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
