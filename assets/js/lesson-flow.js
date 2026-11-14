/* Read-only, geometry-anchored routes for the current teaching event. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const sessions = new WeakMap();
  let serial = 0;
  const colors = {amber:'#b56a0b',blue:'#2468d5',violet:'#8252d3',green:'#148653',red:'#d34259'};
  const svgNode = (tag, attrs={}) => {
    const node=document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
    return node;
  };
  const rect = (el,base) => {
    const r=el.getBoundingClientRect();
    return {left:r.left-base.left,top:r.top-base.top,right:r.right-base.left,bottom:r.bottom-base.top,width:r.width,height:r.height};
  };
  const inside = (p,r) => p.x>r.left+.1 && p.x<r.right-.1 && p.y>r.top+.1 && p.y<r.bottom-.1;
  const crossing = (a,b,r) => a.x===b.x
    ? a.x>r.left+.1 && a.x<r.right-.1 && Math.max(a.y,b.y)>r.top+.1 && Math.min(a.y,b.y)<r.bottom-.1
    : a.y>r.top+.1 && a.y<r.bottom-.1 && Math.max(a.x,b.x)>r.left+.1 && Math.min(a.x,b.x)<r.right-.1;
  function ports(a,b,edge) {
    let from,to;
    if(a.right+8<b.left){from='right';to='left';}
    else if(b.right+8<a.left){from='left';to='right';}
    else if(a.bottom<b.top){from='bottom';to='top';}
    else{from='top';to='bottom';}
    const mobile=window.matchMedia('(max-width:760px)').matches;
    return [(mobile&&edge.mobileFromPort)||edge.fromPort||from,(mobile&&edge.mobileToPort)||edge.toPort||to];
  }
  function anchor(r,port,offset=0) {
    const x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;
    const p=port==='left'?{x:r.left-offset,y}:port==='right'?{x:r.right+offset,y}:port==='top'?{x,y:r.top-offset}:{x,y:r.bottom+offset};
    return {x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10};
  }
  function route(start,end,obstacles,width,height) {
    const uniq = values => [...new Set(values.map(v=>Math.round(v*10)/10))].sort((a,b)=>a-b);
    const xs=uniq([start.x,end.x,10,width-10,...obstacles.flatMap(r=>[r.left-9,r.right+9])].filter(x=>x>=6&&x<=width-6));
    const ys=uniq([start.y,end.y,10,height-10,...obstacles.flatMap(r=>[r.top-9,r.bottom+9])].filter(y=>y>=6&&y<=height-6));
    const ix=xs.indexOf(Math.round(start.x*10)/10),iy=ys.indexOf(Math.round(start.y*10)/10);
    const tx=xs.indexOf(Math.round(end.x*10)/10),ty=ys.indexOf(Math.round(end.y*10)/10);
    if([ix,iy,tx,ty].some(v=>v<0))return null;
    const points=ys.flatMap(y=>xs.map(x=>({x,y}))), columns=xs.length;
    const source=iy*columns+ix,target=ty*columns+tx;
    const blocked=points.map(p=>obstacles.some(r=>inside(p,r)));
    const distances=new Map(),parents=new Map(),heap=[];
    const push = item => {heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].priority<=item.priority)break;heap[i]=heap[p];i=p;}heap[i]=item;};
    const pop = () => {const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].priority<heap[c].priority)c++;if(heap[c].priority>=last.priority)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;};
    const key=(i,d)=>i*3+d;
    distances.set(key(source,0),0);push({i:source,d:0,cost:0,priority:0});
    let finish=null;
    while(heap.length){
      const current=pop(),k=key(current.i,current.d);
      if(current.cost!==distances.get(k))continue;
      if(current.i===target){finish=k;break;}
      const x=current.i%columns,y=Math.floor(current.i/columns);
      const neighbors=[];
      if(x>0)neighbors.push([current.i-1,1]);if(x<columns-1)neighbors.push([current.i+1,1]);
      if(y>0)neighbors.push([current.i-columns,2]);if(y<ys.length-1)neighbors.push([current.i+columns,2]);
      for(const [next,d]of neighbors){
        if(blocked[next]&&next!==target)continue;
        const a=points[current.i],b=points[next];
        if(obstacles.some(r=>crossing(a,b,r)))continue;
        const cost=current.cost+Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+(current.d&&current.d!==d?24:0);
        const nextKey=key(next,d);
        if(cost>=(distances.get(nextKey)??Infinity))continue;
        distances.set(nextKey,cost);parents.set(nextKey,k);
        push({i:next,d,cost,priority:cost+Math.abs(b.x-end.x)+Math.abs(b.y-end.y)});
      }
    }
    if(finish===null)return null;
    const result=[];
    for(let k=finish;k!==undefined;k=parents.get(k))result.push(points[Math.floor(k/3)]);
    return result.reverse();
  }
  function simplify(points){
    const unique=points.filter((p,i)=>!i||p.x!==points[i-1].x||p.y!==points[i-1].y);
    return unique.filter((p,i)=>!i||i===unique.length-1||!((unique[i-1].x===p.x&&p.x===unique[i+1].x)||(unique[i-1].y===p.y&&p.y===unique[i+1].y)));
  }
  function draw(canvas,model,id){
    canvas.querySelector('.lesson-flow-overlay')?.remove();
    if(!canvas.isConnected||!canvas.getClientRects().length)return;
    const base=canvas.getBoundingClientRect(),width=base.width,height=base.height;
    const svg=svgNode('svg',{class:'lesson-flow-overlay',viewBox:`0 0 ${width} ${height}`,width,height,'aria-hidden':'true'});
    const defs=svgNode('defs');svg.append(defs);
    for(const [index,edge]of (model.flows||[]).entries()){
      const from=canvas.querySelector(edge.from),to=canvas.querySelector(edge.to);
      if(!from||!to||!from.getClientRects().length||!to.getClientRects().length)continue;
      const a=rect(from,base),b=rect(to,base),[fp,tp]=ports(a,b,edge);
      const nodes=[...canvas.querySelectorAll('[data-flow-node],.hw-visual,.hw-cpu-readout,.hw-ssd-readout,.hw-component-heading,.hw-part-detail,.hw-simulation-note,.hw-model-caption,.hw-ram-footer,.lesson-live-step,.paging-table-label,.paging-os-ribbon,.foundation-check,.foundation-zone,.allocation-hole,.replacement-proof')];
      const obstacles=nodes.filter(el=>el!==from&&el!==to&&!el.contains(from)&&!el.contains(to)&&!from.contains(el)&&!to.contains(el)&&el.getClientRects().length).map(el=>rect(el,base));
      // Source/target interiors stay closed; their outward stubs are the only
      // entries, keeping routes out of the text and hardware artwork.
      obstacles.push(a,b);
      // Adjacent logical frames may leave little room at a preferred port.
      // Try another edge rather than drawing through the neighboring frame.
      let selected=null;
      const fromPorts=[...new Set([fp,'bottom','top','left','right'])];
      const toPorts=[...new Set([tp,'bottom','top','left','right'])];
      for(const fromPort of fromPorts){
        for(const toPort of toPorts){
          const start=anchor(a,fromPort),end=anchor(b,toPort);
          const startStub=anchor(a,fromPort,7),endStub=anchor(b,toPort,7);
          const middle=route(startStub,endStub,obstacles,width,height);
          if(middle){selected={start,end,points:simplify([start,startStub,...middle,endStub,end])};break;}
        }
        if(selected)break;
      }
      if(!selected)continue;
      const {start,points}=selected;
      const d=points.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
      const tone=colors[edge.tone]?edge.tone:'blue',color=colors[tone],markerId=`flow-arrow-${id}-${index}`;
      const marker=svgNode('marker',{id:markerId,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:12,markerHeight:12,orient:'auto',markerUnits:'userSpaceOnUse'});
      marker.append(svgNode('path',{d:'M 0 0 L 10 5 L 0 10 Z',fill:color}));defs.append(marker);
      const group=svgNode('g',{'data-tone':tone,class:'lesson-flow-route'});
      group.append(svgNode('path',{d,class:'lesson-flow-halo',stroke:color}));
      const path=svgNode('path',{d,class:'lesson-flow-path',stroke:color,'marker-end':`url(#${markerId})`,'data-from':edge.from,'data-to':edge.to,'data-kind':edge.kind||'signal','data-tone':tone});
      const title=svgNode('title');title.textContent=edge.label||'Luồng đang thực hiện';path.append(title);group.append(path);
      if(edge.kind==='data')group.append(svgNode('path',{d,class:'lesson-flow-travel',stroke:color}));
      group.append(svgNode('circle',{cx:start.x,cy:start.y,r:4,fill:color,class:'lesson-flow-origin'}));
      svg.append(group);
    }
    if(svg.querySelector('.lesson-flow-path'))canvas.append(svg);
    canvas.dataset.flowReady='true';
  }
  function render(canvas,model,position={}){
    const previous=sessions.get(canvas);if(previous){cancelAnimationFrame(previous.frame);previous.observer.disconnect();}
    canvas.classList.add('lesson-flow-enabled');canvas.dataset.flowReady='false';
    const focus=model.focus&&canvas.querySelector(model.focus.selector);
    const tone=colors[model.focus?.tone]?model.focus.tone:'amber';
    canvas.dataset.flowTone=tone;
    if(focus){
      focus.classList.add('lesson-focus');focus.dataset.flowFocus='true';focus.dataset.flowTone=tone;
      const strip=focus.closest('.allocation-holes');
      if(strip){
        const a=focus.getBoundingClientRect(),b=strip.getBoundingClientRect();
        if(a.right>b.right-8)strip.scrollLeft+=a.right-b.right+8;
        else if(a.left<b.left+8)strip.scrollLeft-=b.left-a.left+8;
      }
    }
    const banner=document.createElement('div');banner.className='lesson-live-step';banner.dataset.flowTone=tone;
    const count=document.createElement('span');count.className='lesson-live-number';count.textContent=`BƯỚC ${position.cursor+1} / ${position.total}`;
    const content=document.createElement('div'),caption=document.createElement('span'),action=document.createElement('strong');
    caption.className='lesson-live-caption';caption.textContent=model.flows?.length?'THEO MŨI TÊN ĐANG SÁNG':'VỊ TRÍ ĐANG XỬ LÝ';
    action.textContent=model.focus?.label||model.title;content.append(caption,action);
    if(model.flows?.length){const routeLabel=document.createElement('span');routeLabel.className='lesson-live-route';routeLabel.textContent=model.flows.map(edge=>edge.label).join(' · ');content.append(routeLabel);}
    banner.append(count,content);canvas.prepend(banner);
    const status={frame:0,observer:null};
    const schedule=()=>{canvas.dataset.flowReady='false';cancelAnimationFrame(status.frame);status.frame=requestAnimationFrame(()=>draw(canvas,model,++serial));};
    status.observer=new ResizeObserver(schedule);status.observer.observe(canvas);
    // Canvas size and the containing scene can change independently at a breakpoint.
    [...canvas.children].filter(el=>el!==banner).forEach(el=>status.observer.observe(el));
    sessions.set(canvas,status);schedule();
  }
  function reveal(canvas){
    requestAnimationFrame(()=>{
      const focus=canvas.querySelector('.lesson-focus');
      if(!focus)return;
      const r=focus.getBoundingClientRect(),bar=canvas.closest('.lesson')?.querySelector('.lesson-controls');
      const bottom=Math.min(innerHeight-(bar?.offsetHeight||70)-24,bar?.getBoundingClientRect().top-16||innerHeight);
      if(r.top<18||r.bottom>bottom){
        const top=Math.max(24,(bottom-r.height)/2);
        window.scrollBy({top:r.top-top,behavior:'instant'});
      }
    });
  }
  window.MemoryLessonFlow={render,reveal};
})();
