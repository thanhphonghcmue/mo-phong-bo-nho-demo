/* Base/Limit presentation, reading the current snapshot only. No engine mutations. */
window.StudioBase = (() => {
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
    root.innerHTML=`<div class="studio-b-board">
      <section class="box studio-b-source"><div class="studio-b-eyebrow">01 / CPU</div><h3>Yêu cầu truy cập</h3><strong class="studio-b-address">${esc(value)}</strong><p class="formula">${trans?'Độ lệch logic L':'Địa chỉ vật lý cần kiểm tra A'}</p><span class="studio-b-source-foot">${trans?'Tính từ đầu tiến trình':'Chưa đọc hay ghi dữ liệu'}</span></section>
      <div class="studio-b-edge" data-active="${st===1}">${icon('arrow-right')}</div>
      <section id="studio-b-lower" class="box studio-b-gate" data-state="${lowerState}"><div class="studio-b-eyebrow">02 / MMU</div><h3>${trans?'Kiểm tra độ lệch':'Cận dưới'}</h3><div class="studio-b-equation">${lowFormula}</div>${label(lowerState)}<p>${trans?'L phải không âm và nhỏ hơn Limit.':`Base = ${s.base} là địa chỉ đầu tiên được phép.`}</p>${lowerState==='fail'?`<div class="studio-b-stop">${icon('shield-check')} Không đi tiếp vào RAM</div>`:''}</section>
      <div class="studio-b-edge" data-active="${st===2&&!failed}">${icon('arrow-right')}</div>
      <section id="studio-b-upper" class="box studio-b-gate" data-state="${upperState}" data-skipped="${upperState==='skipped'}"><div class="studio-b-eyebrow">03 / MMU</div><h3>${trans?'Cộng địa chỉ gốc':'Cận trên'}</h3>${trans?`<div class="studio-b-equation">${upperFormula}</div><strong id="studio-b-pa" class="studio-b-address">${st>=2&&s.isValid?s.pa:'?'}</strong>`:`<div class="studio-b-equation">${upperState==='skipped'?'A < Base + Limit':upperFormula}</div>`}${label(upperState)}<p>${upperState==='skipped'?(trans?'Độ lệch sai: không cộng, không tạo PA.':'Cận dưới đã chặn. Không kiểm tra thêm.'):trans?(st>=2?`${s.base} + ${s.offset} = ${s.pa}`:'Chỉ cộng sau khi độ lệch hợp lệ.'):`Địa chỉ cuối được phép: ${s.base+s.limit-1}. Cận ${s.base+s.limit} không thuộc vùng.`}</p></section>
      <div class="studio-b-exits">${arrow('studio-b-to-ram',allowed,allowed?'Cho phép':'Chờ kiểm tra','allow')}${arrow('studio-b-to-os',final&&failed,final&&failed?'TRAP':'Đường xử lý lỗi','trap')}</div>
      <section class="box studio-b-destination"><div class="studio-b-eyebrow">04 / KẾT QUẢ</div><div class="studio-b-port studio-b-ram" data-active="${allowed}" data-locked="${!allowed}">${icon('memory-stick')}<div><h3>RAM</h3><b>${allowed?`Truy cập byte ${trans?s.pa:s.addr}`:failed?'Đã khóa truy cập':'Chưa được truy cập'}</b><p>${allowed?'MMU đã cấp quyền.':'Không có dữ liệu được đọc/ghi.'}</p></div></div><div id="studio-b-os" class="studio-b-port studio-b-os" data-active="${final&&failed}">${icon('cpu')}<div><h3>Hệ điều hành</h3><b>${final&&failed?'Nhận trap bảo vệ':failed?'Chờ trap từ MMU':'Chưa nhận trap'}</b><p>${final&&failed?'Xử lý yêu cầu truy cập sai.':'Chỉ xử lý khi MMU báo lỗi.'}</p></div></div></section>
    </div><div class="studio-b-outcome ${branch}" role="note"><b>${failed?'ĐỊA CHỈ BỊ CHẶN':allowed?'TRUY CẬP ĐƯỢC PHÉP':'ĐANG KIỂM TRA'}</b><span>${esc(message)}</span></div>`;
    $('#p0 h2').textContent=trans?'Từ độ lệch đến đúng byte trong RAM':'Một địa chỉ có được vào RAM?';
    $('#b-mode-check').textContent='Kiểm tra địa chỉ';$('#b-mode-trans').textContent='Dịch địa chỉ';
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
    const root=$('#b-flow');root.querySelectorAll('[data-processing]').forEach(e=>e.removeAttribute('data-processing'));
    const box=root.querySelectorAll('.box')[s.st];if(box)box.dataset.processing='true';
  }
  return {render,paint};
})();
