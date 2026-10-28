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
console.log('Task-map layout, merge, cycle, missing-link, zoom-anchor and viewport-fit checks passed.');
