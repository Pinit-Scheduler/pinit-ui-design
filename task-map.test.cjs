const assert=require('node:assert/strict');
const {buildTaskGraph,zoomAt,fitBounds}=require('./task-map-core.js');
const task=(id,previous=[],next=[])=>({id,title:'Task '+id,previous,next,done:false});
const model=buildTaskGraph([task(1,[],[2,3]),task(2,[1],[4]),task(3,[1],[4]),task(4,[2,3]),task(5)]);
assert.equal(model.nodes.length,5,'Merging must not duplicate a shared child');
assert.equal(model.edges.length,4,'previous/next representations must be deduplicated');
assert.equal(model.groups.length,2,'Connected flow and independent tasks remain distinct');
for(const edge of model.edges)assert(edge.target.rank>edge.source.rank,'Dependencies must advance to a later layer');
function checkBounds(graph){for(const node of graph.nodes){assert(Number.isFinite(node.x)&&Number.isFinite(node.y));const group=graph.groups.find(g=>g.id===node.groupId);assert(node.x>=group.x&&node.y>=group.y);assert(node.x+node.width<=group.x+group.width);assert(node.y+node.height<=group.y+group.height);}for(let i=0;i<graph.nodes.length;i++)for(let j=i+1;j<graph.nodes.length;j++){let a=graph.nodes[i],b=graph.nodes[j];assert(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'Node rectangles must not overlap');}}
checkBounds(model);checkBounds(buildTaskGraph([task(1,[],[2,3]),task(2,[1],[4]),task(3,[1],[4]),task(4,[2,3]),task(5)],{orientation:'vertical'}));
const cyclic=buildTaskGraph([task(1,[2],[2]),task(2,[1],[1])]);assert.equal(cyclic.nodes.length,2);assert.equal(cyclic.cycleCount,2);checkBounds(cyclic);
const missing=buildTaskGraph([task(1,[999]),task(2)]);assert.equal(missing.missingEdges,1);assert.equal(missing.nodes.length,2);checkBounds(missing);
const empty=buildTaskGraph([]);assert.equal(empty.nodes.length,0);assert.equal(empty.width,0);
const chain=Array.from({length:100},(_,i)=>task(i,i?[i-1]:[],i<99?[i+1]:[])),chainGraph=buildTaskGraph(chain);assert.equal(chainGraph.nodes.length,100);checkBounds(chainGraph);const chainFit=fitBounds(chainGraph,{width:320,height:500},24);assert(chainGraph.width*chainFit.scale<=272.001,'Fit-all must include a long sequence on a narrow screen');
const before={x:120,y:-35,scale:.7},pivot={x:260,y:180},after=zoomAt(before,1.6,pivot);assert(Math.abs((pivot.x-before.x)/before.scale-(pivot.x-after.x)/after.scale)<1e-8);assert(Math.abs((pivot.y-before.y)/before.scale-(pivot.y-after.y)/after.scale)<1e-8);
for(const width of [320,390,768,1440]){const fit=fitBounds(model,{width,height:500},24);assert(fit.scale>0&&fit.scale<=1);assert(fit.x+model.width*fit.scale<=width-23.99);assert(fit.y+model.height*fit.scale<=476.01);}
const rankedInput=[
 {...task(1,[],[2]),importance:9,due:'2026-10-28'},
 {...task(2,[1]),importance:8,due:'2026-10-29'},
 {...task(3),importance:9,due:'2026-10-30'},
 {...task(4),importance:8,due:'2026-11-05'},
 {...task(5),importance:4,due:'2026-10-27'},
 {...task(6),importance:2,due:undefined},
 {...task(7),importance:9,due:'2026-10-20',done:true},
 {...task(8),importance:9,due:'2026-10-29'}
];
const sourceBeforeRanking=JSON.stringify(rankedInput),plain=buildTaskGraph(rankedInput);
for(const mode of ['priority','importance','deadline']){
 const ranked=buildTaskGraph(rankedInput,{independentLayout:mode,today:'2026-10-28'});
 assert.equal(ranked.nodes.length,rankedInput.length);assert.equal(ranked.edges.length,1,'Ranking must not invent links');checkBounds(ranked);
 assert.deepEqual(ranked.nodes.filter(n=>n.id==='1'||n.id==='2'),plain.nodes.filter(n=>n.id==='1'||n.id==='2'),'Connected sequence positions must remain unchanged');
 assert.equal(ranked.zones.find(z=>z.kind==='completed').ids.join(','),'7','Completed tasks must be outside open-task ranking');
 assert.equal(ranked.zones.reduce((n,z)=>n+z.ids.length,0),6,'Each independent task must appear exactly once');
}
const priority=buildTaskGraph(rankedInput,{independentLayout:'priority',today:'2026-10-28'});
assert.deepEqual(priority.zones.find(z=>z.id==='priority-0').ids,['8','3'],'Equal-importance tasks should use the earlier deadline first');
assert.deepEqual(priority.zones.find(z=>z.id==='priority-1').ids,['4']);assert.deepEqual(priority.zones.find(z=>z.id==='priority-2').ids,['5']);assert.deepEqual(priority.zones.find(z=>z.id==='priority-3').ids,['6']);
const deadlines=buildTaskGraph(rankedInput,{independentLayout:'deadline',today:'2026-10-28'});assert.deepEqual(deadlines.zones.filter(z=>z.kind!=='completed').map(z=>z.id),['date-2026-10-27','date-2026-10-29','date-2026-10-30','date-2026-11-05','date-none']);
checkBounds(buildTaskGraph([{...task(1),done:true}],{independentLayout:'priority',today:'2026-10-28'}));
assert.equal(buildTaskGraph([task(1,[],[2]),task(2,[1])],{independentLayout:'priority',today:'2026-10-28'}).independentInfo,null);
const boundary=buildTaskGraph([{...task(9),importance:7,due:'2027-01-02'}],{independentLayout:'priority',today:'2026-12-31'});assert.deepEqual(boundary.zones.find(z=>z.id==='priority-0').ids,['9']);
assert.equal(JSON.stringify(rankedInput),sourceBeforeRanking,'Map placement must not mutate source records');
console.log('Graph structure, ranking zones, dependency preservation, completed/undated tasks, date boundaries, collision, zoom and fit checks passed.');

for(const mode of ['priority','importance','deadline']){
 const graph=buildTaskGraph(rankedInput,{orientation:'network',independentLayout:mode,today:'2026-10-28'});
 assert.equal(graph.orientation,'network');assert.equal(graph.nodes.length,rankedInput.length);assert.equal(graph.edges.length,plain.edges.length);
 assert.deepEqual(graph.edges.map(e=>[e.from,e.to]),plain.edges.map(e=>[e.from,e.to]));
 for(let i=0;i<graph.nodes.length;i++)for(let j=i+1;j<graph.nodes.length;j++){const a=graph.nodes[i],b=graph.nodes[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'network nodes overlap');}
}
console.log('Network layouts preserve nodes and dependency edges without overlaps.');

const fullOrder=buildTaskGraph([
 {...task(1,[],[2]),importance:1,due:'2026-11-01'},
 {...task(2,[1],[]),importance:9,due:'2026-10-28'},
 {...task(3),importance:8,due:'2026-10-28'},
 {...task(4),importance:3,due:'2026-10-29'}
],{orientation:'network',independentLayout:'importance',today:'2026-10-28'});
assert.equal(fullOrder.groups.length,1);
assert.deepEqual(fullOrder.nodes.map(n=>n.id),['3','4','1','2']);
assert.ok(fullOrder.edges.every(e=>e.source.order<e.target.order));
for(let i=1;i<fullOrder.nodes.length;i++)assert.ok([...fullOrder.edges,...fullOrder.orderEdges].some(e=>e.from===fullOrder.nodes[i-1].id&&e.to===fullOrder.nodes[i].id));
assert.equal(new Set(fullOrder.nodes.map(n=>n.order)).size,4);
console.log('Unified recommendations include every task, respect dependencies and retain continuous order links.');

const {layoutForceTasks}=require('./task-map-core.js');
const forceInput=Array.from({length:40},(_,i)=>({...task(i,i&&i%3?[i-1]:[],[]),importance:i%9+1,due:'2026-10-29'}));
const forceBase=buildTaskGraph(forceInput,{orientation:'network',independentLayout:'priority',today:'2026-10-28'}),forceSnapshot=JSON.stringify(forceBase);
for(const spacing of [.7,1,1.8]){
 const graph=layoutForceTasks(forceBase,{spacing});assert.equal(graph.nodes.length,40);assert.deepEqual(graph.edges.map(e=>[e.from,e.to]),forceBase.edges.map(e=>[e.from,e.to]));
 for(const node of graph.nodes){assert.ok(Number.isFinite(node.x)&&Number.isFinite(node.y));assert.ok(node.x>=0&&node.y>=0&&node.x+node.width<=graph.width&&node.y+node.height<=graph.height);}
 for(let i=0;i<graph.nodes.length;i++)for(let j=i+1;j<graph.nodes.length;j++){const a=graph.nodes[i],b=graph.nodes[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'force labels overlap');}
 assert.deepEqual(graph,layoutForceTasks(forceBase,{spacing}));assert.ok(graph.edges.every(e=>graph.nodes.includes(e.source)&&graph.nodes.includes(e.target)));
}
assert.equal(JSON.stringify(forceBase),forceSnapshot);assert.equal(layoutForceTasks(buildTaskGraph([])).nodes.length,0);
console.log('Force graph: deterministic, non-overlapping, bounded, immutable, and all task links preserved.');

const {layoutExecutionTasks}=require('./task-map-core.js');
const chainPlan=buildTaskGraph([{...task('a',[],['b']),importance:9},{...task('b',['a'],[]),importance:1},{...task('c'),importance:8},{...task('done'),done:true}],{orientation:'network',independentLayout:'importance'});
assert.deepEqual(chainPlan.nodes.map(n=>n.id),['a','b','c','done']);
const directed=layoutExecutionTasks(chainPlan);
assert.equal(directed.nodes.length,4);assert.equal(directed.edges.length,1);assert.ok(directed.orderEdges.every(e=>!e.source.task.done&&!e.target.task.done));
assert.ok(directed.nodes.find(n=>n.id==='done').y>Math.max(...directed.nodes.filter(n=>!n.task.done).map(n=>n.y)));
assert.ok(directed.nodes.find(n=>n.id==='a').x<directed.nodes.find(n=>n.id==='b').x);
console.log('Execution flow keeps dependency continuations together and excludes completed tasks from recommendations.');
