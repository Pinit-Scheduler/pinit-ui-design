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
