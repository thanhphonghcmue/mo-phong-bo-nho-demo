/* Base/Limit presentation, reading the current snapshot only. No engine mutations. */
window.StudioBase = (() => {
  let lastState, resizeObserver, resizeFrame;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => MemoryScenes.icon(name);
  const arrow = (id, active, label, extra='') => `<div id="${id}" class="studio-b-path ${extra}" data-active="${active}" aria-label="${label}"><span>${label}</span><svg viewBox="0 0 64 16" aria-hidden="true"><path d="M1 8h58m-7-6 7 6-7 6"/></svg></div>`;
  const tag = (text,tone='') => `<span class="studio-b-tag ${tone}">${text}</span>`;
  function render(s) {
    const root=$('#b-flow'), trans=s.mode==='translate', st=s.st;
    const lowFail=st>=1 && !s.cond1, highFail=st>=2 && s.cond1 && !s.cond2;
    const failed=trans ? st>=1 && !s.isValid : lowFail || highFail;
    const final=st===3, allowed=final && s.isValid;
    const branch=failed?'denied':allowed?'allowed':'pending';
    const failGate=failed ? trans?'offset':lowFail?'lower':'upper' : '';
    root.dataset.branch=branch;root.dataset.failedGate=failGate;
    root.classList.add('studio-base');
    const value=trans?s.offset:s.addr;
    const lowerState=st<1?'pending':(trans?s.isValid:s.cond1)?'pass':'fail';
    const upperState=trans?(st<2?'pending':s.isValid?'pass':'skipped'):lowFail?'skipped':st<2?'pending':s.cond2?'pass':'fail';
    const label=state=>tag({pending:'Chưa xét',pass:'Đạt',fail:'Chặn tại đây',skipped:'Bỏ qua'}[state],state);
    const lowFormula=trans?`0 ≤ ${esc(value)} < ${s.limit}`:`${esc(value)} ≥ ${s.base}`;
    const upperFormula=trans?'PA = Base + L':`${esc(value)} < ${s.base+s.limit}`;
    const cause=failed?(trans?`${value} ${value<0?'< 0':`≥ Limit (${s.limit})`}`:lowFail?`${value} < Base (${s.base})`:`${value} ≥ Base + Limit (${s.base+s.limit})`):'';
    const message=failed ? final?`MMU phát trap → hệ điều hành xử lý lỗi. Không đọc/ghi RAM.`:`${cause}. Yêu cầu đã bị chặn${!trans&&lowFail?'; không cần xét cận trên':''}. Chờ bước xử lý trap.`
      :allowed?`Đọc/ghi được phép tại byte ${trans?s.pa:s.addr}. Địa chỉ nằm trong vùng tiến trình.`
      :st===0?'CPU gửi yêu cầu. MMU chưa cho phép truy cập RAM.'
      :trans?st===1?'Độ lệch hợp lệ. Bước tiếp sẽ cộng Base để tìm địa chỉ vật lý.':'Đã tìm địa chỉ vật lý. Chờ MMU cho phép truy cập.'
      :st===1?'Đạt cận dưới. Tiếp theo kiểm tra địa chỉ có vượt vùng được cấp hay không.':'Đạt cả hai cận. Chờ MMU cho phép truy cập.';
    const logicTree = trans ? `
      <div class="studio-b-logic-flow" aria-label="Sơ đồ logic phần cứng MMU">
        <div class="b-logic-step ${st===0?'is-active':st>0?'is-done':''}">
          <span class="b-logic-num">1</span>
          <div class="b-logic-body"><small>CPU phát độ lệch</small><strong>L = ${esc(value)}</strong></div>
        </div>
        <div class="b-logic-arrow ${st>=1?'is-flowing':''}">→</div>
        <div class="b-logic-step ${st===1?'is-active':''} ${st>=1?(s.isValid?'is-pass':'is-fail'):''}">
          <span class="b-logic-num">2</span>
          <div class="b-logic-body"><small>0 ≤ L &lt; Limit (${s.limit}) ?</small><strong>${st<1?'Chờ kiểm tra':s.isValid?'✓ HỢP LỆ':'✕ VƯỢT LIMIT (TRAP)'}</strong></div>
        </div>
        <div class="b-logic-arrow ${st>=2&&s.isValid?'is-flowing':''}">→</div>
        <div class="b-logic-step ${st===2?'is-active':''} ${st>=2?(s.isValid?'is-pass':'is-skip'):st>=1&&!s.isValid?'is-skip':''}">
          <span class="b-logic-num">3</span>
          <div class="b-logic-body"><small>Bộ cộng Base + L</small><strong>${!s.isValid&&st>=1?'⚡ BỎ QUA (OFFSET SAI)':st<2?'PA = Base + L':`PA = ${s.pa}`}</strong></div>
        </div>
        <div class="b-logic-arrow ${st>=3?'is-flowing':''}">→</div>
        <div class="b-logic-step ${st===3?'is-active':''} ${st>=3?(s.isValid?'is-pass':'is-fail'):st>=1&&!s.isValid?'is-fail':''}">
          <span class="b-logic-num">4</span>
          <div class="b-logic-body"><small>Kết quả</small><strong>${st<3?(!s.isValid&&st>=1?'⚠️ SẼ TRAP (KHÓA RAM)':'Chờ quyết định'):s.isValid?`✓ ĐỌC RAM [${s.pa}]`:'⚠️ TRAP OS (KHÓA RAM)'}</strong></div>
        </div>
      </div>
    ` : `
      <div class="studio-b-logic-flow" aria-label="Sơ đồ logic phần cứng MMU">
        <div class="b-logic-step ${st===0?'is-active':st>0?'is-done':''}">
          <span class="b-logic-num">1</span>
          <div class="b-logic-body"><small>CPU phát địa chỉ</small><strong>A = ${esc(value)}</strong></div>
        </div>
        <div class="b-logic-arrow ${st>=1?'is-flowing':''}">→</div>
        <div class="b-logic-step ${st===1?'is-active':''} ${st>=1?(s.cond1?'is-pass':'is-fail'):''}">
          <span class="b-logic-num">2</span>
          <div class="b-logic-body"><small>A ≥ Base (${s.base}) ?</small><strong>${st<1?'Chờ kiểm tra':s.cond1?'✓ ĐẠT CẬN DƯỚI':'✕ THẤP HƠN BASE (TRAP)'}</strong></div>
        </div>
        <div class="b-logic-arrow ${st>=2&&s.cond1?'is-flowing':''}">→</div>
        <div class="b-logic-step ${st===2?'is-active':''} ${st>=2?(!s.cond1?'is-skip':s.cond2?'is-pass':'is-fail'):st>=1&&!s.cond1?'is-skip':''}">
          <span class="b-logic-num">3</span>
          <div class="b-logic-body"><small>A &lt; Base+Limit (${s.base+s.limit}) ?</small><strong>${!s.cond1&&st>=1?'⚡ BỎ QUA (DƯỚI SAI)':st<2?'Chờ kiểm tra':s.cond2?'✓ ĐẠT CẬN TRÊN':'✕ VƯỢT CẬN TRÊN (TRAP)'}</strong></div>
        </div>
        <div class="b-logic-arrow ${st>=3?'is-flowing':''}">→</div>
        <div class="b-logic-step ${st===3?'is-active':''} ${st>=3?(s.isValid?'is-pass':'is-fail'):st>=1&&!s.cond1?'is-fail':''}">
          <span class="b-logic-num">4</span>
          <div class="b-logic-body"><small>Kết quả</small><strong>${st<3?(!s.cond1&&st>=1?'⚠️ SẼ TRAP (KHÓA RAM)':'Chờ quyết định'):s.isValid?`✓ VÀO RAM [${s.addr}]`:'⚠️ TRAP OS (KHÓA RAM)'}</strong></div>
        </div>
      </div>
    `;
    root.innerHTML=`${logicTree}<div class="studio-b-board">
      <section id="studio-b-cpu" class="box studio-b-source"><div class="studio-b-eyebrow">01 / CPU</div><h3>Yêu cầu truy cập</h3><strong class="studio-b-address">${esc(value)}</strong><p class="formula">${trans?'Độ lệch logic L':'Địa chỉ vật lý cần kiểm tra A'}</p><span class="studio-b-source-foot">${trans?'Tính từ đầu tiến trình':'Chưa đọc hay ghi dữ liệu'}</span></section>
      <div class="studio-b-edge" data-active="${st===1}">${icon('arrow-right')}</div>
      <section id="studio-b-lower" class="box studio-b-gate" data-state="${lowerState}"><div class="studio-b-eyebrow">02 / MMU</div><h3>${trans?'Kiểm tra độ lệch':'Cận dưới'}</h3><div class="studio-b-equation">${lowFormula}</div>${label(lowerState)}<p>${trans?'L phải không âm và nhỏ hơn Limit.':`Base = ${s.base} là địa chỉ đầu tiên được phép.`}</p>${lowerState==='fail'?`<div class="studio-b-stop">${icon('shield-check')} <b>Chặn tại đây</b>: Vi phạm cận dưới!</div>`:''}</section>
      <div class="studio-b-edge" data-active="${st===2&&!failed}">${icon('arrow-right')}</div>
      <section id="studio-b-upper" class="box studio-b-gate" data-state="${upperState}" data-skipped="${upperState==='skipped'}"><div class="studio-b-eyebrow">03 / MMU</div><h3>${trans?'Cộng địa chỉ gốc':'Cận trên'}</h3>${trans?`<div class="studio-b-equation">${upperFormula}</div><strong id="studio-b-pa" class="studio-b-address">${st>=2&&s.isValid?s.pa:'?'}</strong>`:`<div class="studio-b-equation">${upperState==='skipped'?'A < Base + Limit':upperFormula}</div>`}${label(upperState)}<p>${upperState==='skipped'?(trans?'Độ lệch sai: không cộng, không tạo PA.':'Cận dưới đã chặn. Bỏ qua kiểm tra này.'):trans?(st>=2?`${s.base} + ${s.offset} = ${s.pa}`:'Chỉ cộng sau khi độ lệch hợp lệ.'):`Địa chỉ cuối được phép: ${s.base+s.limit-1}. Cận ${s.base+s.limit} không thuộc vùng.`}</p>${upperState==='fail'?`<div class="studio-b-stop">${icon('shield-check')} <b>Chặn tại đây</b>: Vượt quá cận trên!</div>`:''}</section>
      <div class="studio-b-exits">${arrow('studio-b-to-ram',allowed,allowed?'Cho phép':'Chờ kiểm tra','allow')}${arrow('studio-b-to-os',final&&failed,final&&failed?'TRAP':'Đường xử lý lỗi','trap')}</div>
      <section class="box studio-b-destination"><div class="studio-b-eyebrow">04 / KẾT QUẢ</div><div id="studio-b-ram" class="studio-b-port studio-b-ram" data-active="${allowed}" data-locked="${!allowed}">${icon('memory-stick')}<div><h3>RAM</h3><b>${allowed?`✓ Truy cập byte ${trans?s.pa:s.addr}`:failed?'🔒 Đã khóa truy cập':'Chưa được truy cập'}</b><p>${allowed?'MMU đã cấp quyền.':'Không có dữ liệu được đọc/ghi.'}</p></div></div><div id="studio-b-os" class="studio-b-port studio-b-os" data-active="${final&&failed}">${icon('cpu')}<div><h3>Hệ điều hành</h3><b>${final&&failed?'⚠️ Nhận trap bảo vệ':failed?'Chờ trap từ MMU':'Chưa nhận trap'}</b><p>${final&&failed?'Xử lý ngắt truy cập trái phép.':'Chỉ xử lý khi MMU báo lỗi.'}</p></div></div></section>
    </div><div class="studio-b-outcome ${branch}" role="note"><b>${failed?'ĐỊA CHỈ BỊ CHẶN':allowed?'TRUY CẬP ĐƯỢC PHÉP':'ĐANG KIỂM TRA'}</b><span>${esc(message)}</span></div>`;
    $('#p0 h2').textContent=trans?'Từ độ lệch đến đúng byte trong RAM':'Một địa chỉ có được vào RAM?';
    $('#b-mode-check').textContent='Kiểm tra địa chỉ';$('#b-mode-trans').textContent='Dịch địa chỉ';
    $('label[for="b-base"]').textContent='Base · địa chỉ đầu';
    $('label[for="b-limit"]').textContent='Limit · số byte';
    $('#b-addr-lbl').textContent=trans?'Độ lệch logic (L)':'Địa chỉ cần kiểm tra (A)';
    for(const [id,text]of[['low','Đúng Base'],['high','Byte cuối'],['over','Chạm cận trên'],['under','Thấp hơn Base'],['rand','Ngẫu nhiên']]){
      const b=$('#b-pre-'+id);if(b){b.title=b.textContent;b.textContent=text;}
    }
    for(const [id,text]of[['std','Ví dụ hợp lệ'],['low','Đầu tiến trình'],['over','Chạm Limit'],['under','Độ lệch âm'],['rand','Ngẫu nhiên']]){
      const b=$('#b-pre-t-'+id);if(b){b.title=b.textContent;b.textContent=text;}
    }
    if($('#b-sample'))$('#b-sample').textContent='Khôi phục';
    renderMemory(s,failed,allowed);
  }
  function renderMemory(s,failed,allowed){
    const track=$('#b-ram-track'),trans=s.mode==='translate';
    const target=trans?(s.st>=2&&s.isValid?s.pa:null):s.addr;
    const upper=s.base+s.limit,span=Math.max(upper+Math.max(s.limit*.3,1),target===null?0:target+Math.max(s.limit*.2,1));
    const width=Math.max(26,Math.min(68,s.limit/span*100));
    const left=s.base===0?0:Math.min(100-width-12,s.base/span*100),right=100-left-width;
    const pos=target===null?null:target<s.base?(s.base?Math.max(0,target)/s.base*left:0):target<upper?left+(target-s.base)/s.limit*width:left+width+Math.min(1,(target-upper)/(span-upper))*right;
    track.dataset.verdict=s.st<3?'pending':allowed?'allowed':'denied';
    track.classList.add('studio-b-memory');
    track.innerHTML=`${left?`<div class="used studio-memory-other" style="width:${left}%"><span>Vùng khác</span></div>`:''}<div class="studio-memory-owned" style="width:${width}%"><span>VÙNG CỦA TIẾN TRÌNH</span><b>${s.base} <i>đến</i> ${upper-1}</b><small>${s.limit} byte được cấp</small></div><div class="studio-memory-other" style="width:${right}%"><span>Vùng khác</span></div>${pos===null?'':`<div class="b-pointer ${failed?'trap':''}" style="left:${Math.max(1,Math.min(99,pos))}%"><span class="plabel">${trans?'PA':'A'} = ${target}${s.st===3?allowed?' · được phép':' · bị chặn':''}</span><span class="pin">▼</span></div>`}`;
    const label=track.querySelector('.plabel');if(label){const r=label.getBoundingClientRect(),bounds=track.getBoundingClientRect();label.style.left=Math.min(0,bounds.right-r.right)+Math.max(0,bounds.left-r.left)+'px';}
    $('#b-val-range').textContent=`[${s.base}, ${upper}) · thước minh họa`;
    $('.b-ram-legend').innerHTML=`<span><i class="studio-legend-other"></i>Vùng ngoài tiến trình</span><span><i class="studio-legend-owned"></i>Vùng được cấp quyền · ${s.limit} byte</span>`;
  }
  function paint(s){
    lastState={...s};
    const root=$('#b-flow');root.querySelectorAll('[data-processing]').forEach(e=>e.removeAttribute('data-processing'));
    const boxes=root.querySelectorAll('.box'),box=boxes[s.st];
    root.querySelectorAll('.studio-b-focus-badge').forEach(e=>e.remove());
    const skipped=s.st===2 && $('#studio-b-upper').dataset.skipped==='true';
    const denied=root.dataset.branch==='denied';
    const captions=['Bắt đầu tại đây',denied?'Chặn yêu cầu':'Kiểm tra điều kiện',skipped?'Bỏ qua bước này':s.mode==='translate'?'Cộng Base với L':'Kiểm tra cận trên',s.isValid?'Cho phép vào RAM':'Chuyển lỗi sang HĐH'];
    if(box){
      box.dataset.processing='true';box.dataset.focusTone=skipped?'skip':denied?'deny':'live';
      box.querySelector('.studio-b-eyebrow').insertAdjacentHTML('beforeend',`<span class="studio-b-focus-badge"><b>BƯỚC ${s.st+1}</b><span>${captions[s.st]}</span></span>`);
    }
    drawRoute(s);
    if(!resizeObserver){
      resizeObserver=new ResizeObserver(schedulePaint);resizeObserver.observe(root);
    }
  }
  function drawRoute(s){
    const root=$('#b-flow'),board=root.querySelector('.studio-b-board');
    board.querySelector('#studio-b-route')?.remove();
    root.dataset.liveRoute='';
    const failed=root.dataset.failedGate,skipped=$('#studio-b-upper').dataset.skipped==='true';
    let from,to;
    if(s.st===1){from='studio-b-cpu';to='studio-b-lower';}
    else if(s.st===2&&!skipped){from='studio-b-lower';to='studio-b-upper';}
    else if(s.st===3){from=!s.isValid&&(failed==='lower'||failed==='offset')?'studio-b-lower':'studio-b-upper';to=s.isValid?'studio-b-ram':'studio-b-os';}
    if(!from)return;
    const bounds=board.getBoundingClientRect(),a=$('#'+from).getBoundingClientRect(),b=$('#'+to).getBoundingClientRect();
    if(!bounds.width||!bounds.height||!a.width||!b.width)return;
    const vertical=matchMedia('(max-width:900px)').matches;
    const bypass=s.st===3&&from==='studio-b-lower';
    let d;
    if(vertical){
      if(s.st===3){
        const x=14,sy=a.bottom-bounds.top-12,y=bounds.height-16;
        const tx=b.left-bounds.left+b.width/2,ty=b.bottom-bounds.top+6;
        d=`M ${a.left-bounds.left+8} ${sy} H ${x} V ${y} H ${tx} V ${ty}`;
      }else{
        const sx=a.left-bounds.left+a.width/2,sy=a.bottom-bounds.top+4;
        const tx=b.left-bounds.left+b.width/2,ty=b.top-bounds.top-6,mid=(sy+ty)/2;
        d=`M ${sx} ${sy} V ${mid} H ${tx} V ${ty}`;
      }
    }else if(bypass){
      const sx=a.left-bounds.left+a.width/2,sy=a.bottom-bounds.top+4;
      const tx=b.left-bounds.left+b.width/2,ty=b.bottom-bounds.top+6,y=bounds.height-25;
      d=`M ${sx} ${sy} V ${y} H ${tx} V ${ty}`;
    }else{
      const sx=a.right-bounds.left+4,sy=a.top-bounds.top+a.height/2;
      const tx=b.left-bounds.left-6,ty=b.top-bounds.top+b.height/2,mid=(sx+tx)/2;
      d=`M ${sx} ${sy} H ${mid} V ${ty} H ${tx}`;
    }
    root.dataset.liveRoute=bypass?'bypass':'direct';
    const note=s.st===3&&(bypass||vertical)?`<text class="studio-b-route-caption" x="${vertical?28:a.left-bounds.left+a.width/2+16}" y="${bounds.height-(vertical?25:34)}">${s.isValid?'Cho phép vào RAM':'TRAP → Hệ điều hành'}</text>`:'';
    board.insertAdjacentHTML('beforeend',`<svg id="studio-b-route" class="studio-b-route ${root.dataset.branch==='denied'?'is-denied':''}" data-from="${from}" data-to="${to}" viewBox="0 0 ${bounds.width} ${bounds.height}" aria-hidden="true"><defs><marker id="studio-b-head" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1 11 6 1 11Z" fill="currentColor"/></marker></defs><path class="studio-b-route-under" d="${d}"/><path class="studio-b-route-line" d="${d}" marker-end="url(#studio-b-head)"/>${note}</svg>`);
  }
  function schedulePaint(){
    cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(()=>{if(lastState)paint(lastState);});
  }
  function compactControls(){
    const stage=$('#p0 .stage'),quick=stage.querySelector(':scope>.quick');
    if($('#b-options'))return;
    const options=document.createElement('details');options.id='b-options';options.className='studio-b-options';
    options.innerHTML='<summary>Đổi chế độ · Thử ví dụ khác</summary><div class="studio-b-options-body"></div>';
    quick.after(options);
    const body=options.lastElementChild;
    body.append(stage.querySelector('.mode-bar'),stage.querySelector('.scene-scenarios'),$('#b-presets-check'),$('#b-presets-trans'));
  }
  document.addEventListener('DOMContentLoaded',compactControls,{once:true});
  window.addEventListener('resize',schedulePaint,{passive:true});
  document.addEventListener('click',event=>{if(event.target.closest('#t0'))schedulePaint();});
  return {render,paint};
})();
