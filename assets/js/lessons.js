/* A small teaching surface over the existing, tested snapshot engines. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const topics = {
    b: {panel:'p0', tab:'t0', nav:'Bảo vệ địa chỉ', title:'Địa chỉ này có được vào RAM?', intro:'RAM là một dãy ô có địa chỉ. Chương trình chỉ được vào vùng đã cấp cho mình.',
      examples:[['inside','125 · nằm trong vùng'],['outside','140 · vừa ngoài vùng'],['translate','Dịch địa chỉ · L = 24','practice'],['translate-outside','Dịch địa chỉ · L = 40 bị chặn','practice']],default:'translate',
      fields:[['base','Vùng bắt đầu ở (Base)','number','100'],['limit','Số byte được cấp (Limit)','number','40'],['address','Địa chỉ muốn vào (A)','number','125']],
      help:'Ví dụ nhỏ để dễ nhìn. Base là địa chỉ bắt đầu; Limit là số byte, không phải địa chỉ cuối.'},
    a: {panel:'p1', tab:'t1', nav:'Tìm chỗ trống', title:'Chỗ nào đủ để đặt chương trình?', intro:'Chương trình cần một chỗ liền nhau. Xem từng vùng trống, rồi chọn theo đúng quy tắc.',
      examples:[['small','3 vùng trống · 2 yêu cầu'],['fragmented','Đủ tổng chỗ, nhưng bị chia nhỏ'],['sequence','4 vùng trống · 3 yêu cầu','practice']],default:'sequence',
      algorithms:[['first','First-fit · đủ đầu tiên'],['best','Best-fit · đủ và nhỏ nhất'],['worst','Worst-fit · lớn nhất']],
      fields:[['holes','Các vùng trống, từ trái sang phải (KB)','text','3 6 4'],['requests','Lần lượt cần bao nhiêu KB?','text','4 2']],
      help:'Mỗi số là kích thước một vùng hoặc một yêu cầu. Các vùng trống cách nhau bởi bộ nhớ đang dùng.'},
    x: {panel:'p2', tab:'t2', nav:'Tìm địa chỉ thật', title:'Byte cần tìm đang ở đâu trong RAM?', intro:'Trang là một phần của chương trình. Khung là chỗ chứa một trang trong RAM. Tìm đúng khung rồi giữ nguyên vị trí trong trang.',
      examples:[['miss','Chưa có chỉ đường trong TLB'],['hit','TLB đã nhớ đường'],['fault','Trang chưa nạp · cần OS hỗ trợ','practice']],default:'fault',
      fields:[['address','Địa chỉ cần tìm','number','13'],['size','Mỗi trang có bao nhiêu byte?','number','4']],
      help:'Ví dụ có 4 trang. Bảng chỉ đường mẫu: trang 0→khung 5, 1→6, 2→1, 3→2. Cỡ trang dùng 4, 8 hoặc 16 byte.'},
    v: {panel:'p4', tab:'t4', nav:'Nạp trang vào RAM', title:'Trang chưa có trong RAM thì làm gì?', intro:'CPU chỉ dùng được trang trong RAM. Nếu trang chưa có, hệ điều hành phải lấy từ ổ đĩa, nạp xong rồi chạy lại lệnh.',
      examples:[['load','Còn một khung trống'],['hit','Trang đã có sẵn trong RAM'],['full','RAM đầy · phải nhường một chỗ'],['dirty','RAM đầy · trang đã sửa · 4 lượt','practice']],default:'dirty',
      fields:[['refs','Lần lượt cần những trang nào?','text','3 1 3'],['frames','RAM có bao nhiêu khung?','number','2']],
      help:'Khi tự đổi ví dụ: RAM bắt đầu trống, dùng FIFO nếu hết chỗ. Mỗi số là một trang, không phải số khung.'},
    r: {panel:'p3', tab:'t3', nav:'Chọn trang ra', title:'RAM đầy: trang nào phải nhường chỗ?', intro:'Mỗi khung chỉ chứa một trang. Quy tắc chọn trang ra khác nhau sẽ cho kết quả khác nhau.',
      examples:[['short','Chuỗi ngắn · thấy rõ vì sao trang ra'],['textbook','Chuỗi kiểm chứng trong giáo trình','reference'],['belady','Ví dụ nghịch lý Belady','reference'],['practice','RAM có sẵn 3 trang · 6 lượt','practice']],default:'practice',
      algorithms:[['FIFO','FIFO · vào trước, ra trước'],['LRU','LRU · lâu chưa dùng nhất'],['OPT','OPT · lâu mới cần lại nhất'],['CLOCK','Clock · cho cơ hội thứ hai']],
      fields:[['refs','Lần lượt cần những trang nào?','text','1 2 3 1 4 2'],['frames','RAM có bao nhiêu khung?','number','3']],
      help:'Khi tự đổi ví dụ, RAM bắt đầu trống. Trang là thẻ dữ liệu; khung là chỗ đặt thẻ. FIFO xét lúc nạp; LRU xét lần dùng; OPT biết trước tương lai; Clock xét bit R.'},
  };
  const purposes = {
    b: {key:'safety',label:'An toàn',note:'Chặn truy cập ngoài vùng đã cấp.'},
    a: {key:'efficiency',label:'Hiệu quả',note:'Chọn chỗ trống phù hợp trong RAM.'},
    x: {key:'efficiency',label:'Hiệu quả',note:'Tìm đúng địa chỉ; TLB nhớ các bản dịch vừa dùng.'},
    v: {key:'virtual',label:'Không giới hạn',note:'Không cần nạp toàn bộ chương trình cùng lúc. RAM thực tế vẫn hữu hạn.'},
    r: {key:'virtual',label:'Không giới hạn',note:'Dùng lại các khung RAM để chạy tiếp. RAM thực tế vẫn hữu hạn.'},
  };
  const caseNotes = {
    b:{inside:'Làm quen · kiểm tra địa chỉ vật lý A trong vùng Base…Base+Limit−1.',outside:'Làm quen · kiểm tra đúng cận trên không bao gồm dấu bằng.',translate:'Thử thêm · kiểm tra L, cộng Base rồi mới truy cập RAM.', 'translate-outside':'Thử thêm · L bằng Limit: chặn trước khi tạo địa chỉ truy cập RAM.'},
    a:{small:'Làm quen · 3 lỗ trống, 2 yêu cầu; xem phần dư sau từng lần cấp.',fragmented:'Làm quen · tổng trống đủ nhưng không có vùng liền nhau đủ lớn.',sequence:'Thử thêm · 4 lỗ và 3 yêu cầu liên tiếp; phần dư của lượt trước ảnh hưởng lượt sau.'},
    x:{miss:'Làm quen · TLB miss nhưng trang đã ở RAM: không có lỗi trang.',hit:'Làm quen · TLB có sẵn bản dịch, bỏ qua tra bảng trang.',fault:'Thử thêm · TLB miss → thiếu trang → OS nạp → cập nhật TLB → đọc đúng byte.'},
    v:{load:'Làm quen · một lần nạp vào khung trống, rồi cập nhật bảng trang.',hit:'Làm quen · dùng trang có sẵn, không đọc SSD.',full:'Làm quen · RAM đầy, chọn một trang sạch nhường chỗ.',dirty:'Thử thêm · 4 lượt: ghi lại trang đã sửa, nạp trang mới, hai lượt hit và một lần thay trang sạch.'},
    r:{short:'Làm quen · bắt đầu RAM trống để thấy thứ tự nạp.',textbook:'Đối chiếu · chuỗi tham chiếu dài từ giáo trình.',belady:'Đối chiếu · thử tăng số khung để quan sát nghịch lý FIFO.',practice:'Thử thêm · đã nạp và dùng lần lượt 1 → 2 → 3. Dùng lại trang 1, rồi so sánh thứ tự chọn trang ra.'},
  };
  const modelNotes = {
    b:'Mỗi bước là một phép kiểm tra hoặc dịch địa chỉ của MMU, không phải một chu kỳ CPU.',
    a:'Mô hình xét các lỗ trống và cấp vùng liên tục. Không mô phỏng giải phóng/gộp lỗ hoặc bộ cấp phát của một hệ điều hành cụ thể.',
    x:'Ví dụ thiếu trang gộp việc nạp và cập nhật bảng trang trong một bước. Demo 4 tách hai việc này để quan sát riêng.',
    v:'Các quyết định chọn trang, ghi lại, nạp và cập nhật bảng trang được giữ đúng thứ tự. Chọn khung trống+nạp và thử lại+đọc/ghi được gộp; không mô phỏng từng ngắt, DMA hay thời gian chờ I/O.',
    r:'Demo này xét quyết định thay các trang sạch. Demo 4 minh họa ghi trang đã sửa; Clock ở đây tách từng lần xét/hạ bit R.',
  };
  function exampleOptions(topic){
    return [['Làm quen',undefined],['Đối chiếu giáo trình','reference'],['Thử thêm','practice']].map(([label,level])=>{
      const options=topic.examples.filter(option=>option[2]===level);
      return options.length?`<optgroup label="${label}">${options.map(([value,text])=>`<option value="${value}">${escape(text)}</option>`).join('')}</optgroup>`:'';
    }).join('');
  }
  let active = 'b', timer = null, booting = true;
  const roots = {};
  const formValue = (id,key) => $(`lesson-${id}-${key}`).value.trim();
  const set = (id,value) => {const el=$(id); if(el)el.value=String(value);};
  const click = id => {const el=$(id);if(!el)throw Error(`Không tìm thấy điều khiển ${id}.`);el.click();};
  function pause(){
    clearTimeout(timer);timer=null;window.MemoryTeaching.pause();
    Object.keys(topics).forEach(id=>{const b=$(`lesson-${id}-play`);if(b){b.textContent='Tự chạy';b.setAttribute('aria-pressed','false');}});
  }
  function configure(id,values){
    pause();
    Object.entries(values).forEach(([key,value])=>set(key,value));
    click(id+'-config-apply');
    const status=$(id+'-config')?.querySelector('.teach-config-status');
    if(status?.classList.contains('teach-error'))throw Error(status.textContent);
  }
  function allocation(holes,requests){
    document.querySelector('#a-mode [data-m="ex"]').click();
    set('a-holes',holes);set('a-reqs',requests);set('a-c-gap',1);click('a-apply');
    const error=$('a-error');if(error?.textContent)throw Error(error.textContent);
  }
  function paging(address,size,cache='',missing=false){
    configure('x',{'x-addr':address,'x-c-size':size,'x-c-pages':4,'x-c-frames':8,'x-c-tlb':4,'x-c-pt':missing?'5 6 1 -':'5 6 1 2','x-c-other':'','x-c-cache':cache});
  }
  function virtual(refs='3',frames=2,ram='0 -',dirty=''){
    configure('v',{'v-c-pages':32,'v-c-frames':frames,'v-c-ram':ram,'v-c-refs':refs,'v-c-policy':'FIFO','v-c-dirty':dirty,'v-c-denied':'','v-c-unmapped':'','v-c-order':'','v-c-recent':'','v-c-bits':'','v-c-hand':0,'v-op':'read'});
  }
  function replacement(refs='1 2 3 1 4 2',frames=3,warm=false){
    configure('r',{'r-c-n':frames,'r-c-refs':refs,'r-c-ram':warm?'1 2 3':'','r-c-order':warm?'1 2 3':'','r-c-recent':warm?'1 2 3':'','r-c-bits':warm?'1 1 1':'','r-c-hand':0});
  }
  function applyExample(id,example){
    pause();
    $(`lesson-${id}-example`).querySelector('option[value="custom"]')?.remove();
    $(`lesson-${id}-example`).value=example;
    roots[id].dataset.invalid='false';roots[id].dataset.draft='false';
    if(id==='b'){
      const translate=example.startsWith('translate');
      click(translate?'b-mode-trans':'b-mode-check');set('b-base',100);set('b-limit',40);set('b-addr',translate?example==='translate-outside'?40:24:example==='outside'?140:125);click('b-go');
    }else if(id==='a')allocation(example==='sequence'?'5 8 4 7':example==='fragmented'?'3 3 3':'3 6 4',example==='sequence'?'4 6 3':example==='fragmented'?'5':'4 2');
    else if(id==='x')paging(13,4,example==='hit'?'3:2':'',example==='fault');
    else if(id==='v')virtual(example==='dirty'?'2 1 2 3':'3',2,example==='dirty'||example==='full'?'0 1':example==='hit'?'3 1':'0 -',example==='dirty'?'0':'');
    else if(id==='r'){
      if(example==='textbook')click('r-book');
      else if(example==='belady')click('r-bel');
      else if(example==='practice')replacement('1 4 2 5 1 2',3,true);
      else replacement();
    }
    syncForm(id);render(id);
  }
  function syncForm(id){
    const s=MemoryTeaching.snapshot(id);
    const values=id==='b'?{base:s.base,limit:s.limit,address:s.mode==='translate'?s.offset:s.addr}
      :id==='a'?{holes:s.holes.join(' '),requests:s.reqs.join(' ')}
      :id==='x'?{address:s.plan.addr,size:s.pageSize}
      :id==='v'?{refs:(s.sequence||[s.page]).join(' '),frames:s.ram.length}
      :{refs:s.refs.join(' '),frames:s.n};
    Object.entries(values).forEach(([key,value])=>set(`lesson-${id}-${key}`,value));
    if(topics[id].algorithms)set(`lesson-${id}-algorithm`,s.alg);
    if(id==='b'){
      const translate=s.mode==='translate';
      $('lesson-b-address').closest('label').querySelector('.lesson-field-label').textContent=translate?'Độ lệch logic trong vùng (L)':'Địa chỉ muốn vào (A)';
      roots.b.querySelector('.lesson-settings>p').textContent=translate?'L là vị trí tính từ đầu chương trình. Giữ 0 ≤ L < Limit, sau đó PA = Base + L.':topics.b.help;
    }
  }
  function number(value,label,min,max){
    if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<min||Number(value)>max)throw Error(`${label}: nhập số nguyên từ ${min} đến ${max}.`);
    return Number(value);
  }
  function list(value,label,maxLength=16,min=0,max=31){
    const parts=value.split(/[\s,;]+/).filter(Boolean);
    if(!parts.length||parts.length>maxLength)throw Error(`${label}: cần từ 1 đến ${maxLength} số.`);
    return parts.map(p=>number(p,label,min,max)).join(' ');
  }
  function submit(id){
    pause();
    const error=$(`lesson-${id}-error`);
    try{
      if(id==='b'){
        const base=number(formValue(id,'base'),'Base',0,1000000000),limit=number(formValue(id,'limit'),'Limit',1,1000000000),address=number(formValue(id,'address'),'Địa chỉ',0,2000000000);
        click(MemoryTeaching.snapshot('b').mode==='translate'?'b-mode-trans':'b-mode-check');set('b-base',base);set('b-limit',limit);set('b-addr',address);click('b-go');
      }else if(id==='a')allocation(list(formValue(id,'holes'),'Vùng trống',6,1,100000),list(formValue(id,'requests'),'Yêu cầu',6,1,100000));
      else if(id==='x'){
        const size=number(formValue(id,'size'),'Cỡ trang',4,16);
        if(![4,8,16].includes(size))throw Error('Chọn cỡ trang 4, 8 hoặc 16 byte để dễ nhìn.');
        paging(number(formValue(id,'address'),'Địa chỉ',0,4*size-1),size);
      }else if(id==='v')virtual(list(formValue(id,'refs'),'Trang cần đọc',12),number(formValue(id,'frames'),'Số khung',1,4),'');
      else replacement(list(formValue(id,'refs'),'Trang cần đọc',48,0,9999),number(formValue(id,'frames'),'Số khung',1,5));
      error.textContent='';error.hidden=true;
      roots[id].dataset.invalid='false';roots[id].dataset.draft='false';syncForm(id);
      const selector=$(`lesson-${id}-example`);
      if(!selector.querySelector('option[value="custom"]'))selector.add(new Option('Ví dụ tự nhập','custom'));
      selector.value='custom';render(id);
    }catch(err){
      error.textContent=err.message;error.hidden=false;
      roots[id].dataset.invalid='true';
      roots[id].querySelector('.lesson-canvas').innerHTML='<p class="lesson-muted">Chưa chạy ví dụ mới. Sửa dữ liệu ở dưới rồi bấm “Chạy ví dụ này”.</p>';
      roots[id].querySelector('.lesson-title').textContent='Dữ liệu chưa hợp lệ';
      roots[id].querySelector('.lesson-why').textContent=err.message;
      roots[id].querySelector('.lesson-result').hidden=true;
      ['next','prev','play'].forEach(action=>$(`lesson-${id}-${action}`).disabled=true);
    }
  }
  function render(id){
    const root=roots[id],view=window.MemoryLessonViews?.[id];
    if(!root||!view)return;
    if(root.dataset.invalid==='true')return;
    const e=MemoryTeaching.event(id);e.state=MemoryTeaching.snapshot(id);
    const position=MemoryTeaching.position(id),model=view(e,position),complete=!MemoryTeaching.canNext(id);
    root.querySelector('h2').textContent=id==='b'&&e.state.mode==='translate'?'Từ vị trí trong chương trình đến địa chỉ RAM':topics[id].title;
    root.querySelector('.lesson-intro').textContent=id==='b'&&e.state.mode==='translate'?'MMU kiểm tra L có nằm trong vùng, rồi cộng Base để tìm địa chỉ thật trong RAM.':topics[id].intro;
    const example=$(`lesson-${id}-example`).value;
    root.querySelector('.lesson-case-note').textContent=example==='custom'?(id==='v'||id==='r'?'Ví dụ tự nhập · RAM bắt đầu trống, xử lý lần lượt chuỗi đã nhập.':'Ví dụ tự nhập · quan sát từng bước với dữ liệu vừa áp dụng.'):caseNotes[id][example]||'';
    const canvas=root.querySelector('.lesson-canvas');
    canvas.innerHTML=model.html;
    window.MemoryLessonFlow?.render(canvas,model,position);
    root.querySelector('.lesson-current').textContent=`Bước ${position.cursor+1} / ${position.total}`;
    root.querySelector('.lesson-title').textContent=model.title;
    root.querySelector('.lesson-why').textContent=model.why;
    root.querySelector('.lesson-next').textContent=complete?'Đã xong. Bấm Làm lại để quan sát từ đầu.':`Tiếp theo: ${model.next}`;
    root.querySelector('.lesson-count').textContent=`Bước ${position.cursor+1}/${position.total} · ${model.title}`;
    const result=root.querySelector('.lesson-result');
    result.hidden=!complete;result.textContent=complete?(model.result||model.why):'';
    const draft=root.dataset.draft==='true';
    $(`lesson-${id}-prev`).disabled=draft||position.cursor===0;
    $(`lesson-${id}-next`).disabled=draft||complete;
    $(`lesson-${id}-play`).disabled=draft||complete;
    if(draft)root.querySelector('.lesson-next').textContent='Đang sửa ví dụ. Bấm “Chạy ví dụ này” hoặc Làm lại để tiếp tục.';
    root.dataset.invalid='false';
    renderHistory(id,position);
    if(complete&&id===active&&timer!==null)pause();
  }
  function renderHistory(id,position){
    const root=roots[id], list=root.querySelector('.lesson-step-log');
    if(!root.querySelector('.lesson-history').open)return;
    const trace=MemoryTeaching.trace(id), signature=`${trace[0]?.scenarioId}:${position.cursor}:${position.seen}:${root.dataset.draft}`;
    if(list.dataset.signature===signature)return;
    const focused=list.contains(document.activeElement)?document.activeElement.dataset.step:null;
    list.dataset.signature=signature;
    list.innerHTML=trace.slice(0,position.seen+1).map((entry,i)=>{
      const short=MemoryLessonViews[id](entry,{cursor:i,total:trace.length});
      return `<li><button type="button" data-step="${i}" ${root.dataset.draft==='true'?'disabled':''} ${i===position.cursor?'aria-current="step"':''}><span>${i+1}</span>${escape(short.title)}</button></li>`;
    }).join('');
    if(focused!==null)list.querySelector(`[data-step="${focused}"]`)?.focus({preventScroll:true});
  }
  function auto(id){
    if(timer!==null){pause();return;}
    const tick=()=>{
      if(!MemoryTeaching.canNext(id)){pause();return;}
      MemoryTeaching.next(id);
      window.MemoryLessonFlow?.reveal(roots[id].querySelector('.lesson-canvas'));
      if(!MemoryTeaching.canNext(id)){pause();return;}
      timer=setTimeout(tick,1600);
    };
    $(`lesson-${id}-play`).textContent='Tạm dừng';$(`lesson-${id}-play`).setAttribute('aria-pressed','true');
    timer=setTimeout(tick,1600);
  }
  function init(){
    if(!window.MemoryTeaching)return;
    // Maintainer-only surface for existing deep regression checks.
    if(new URLSearchParams(location.search).get('view')==='diagnostic'){
      document.body.classList.remove('lesson-mode');return;
    }
    document.documentElement.dataset.theme='light';
    $('theme-toggle')?.setAttribute('hidden','');
    document.querySelector('.header-titles h1').textContent='Khám phá bên trong bộ nhớ';
    if(window.MemoryHardware){
      const guide=document.createElement('details');guide.className='hardware-guide';guide.id='hardware-guide';
      guide.innerHTML=`<summary><span>Nhìn gần linh kiện</span><small>CPU · thanh RAM · SSD · GPU</small></summary><div class="hardware-guide-grid">${[
        ['cpu','CPU · bộ xử lý','Chạy lệnh; yêu cầu đọc hoặc ghi dữ liệu.'],
        ['ram','RAM · bộ nhớ làm việc','Giữ dữ liệu chương trình đang dùng.'],
        ['ssd','SSD · nơi lưu dữ liệu','Giữ bản lưu; nạp trang vào RAM khi cần.'],
        ['gpu','GPU · bộ xử lý đồ họa','Xử lý đồ họa; không tham gia các thuật toán RAM trong 5 demo này.'],
      ].map(([kind,name,description])=>`<figure>${MemoryHardware.visual(kind)}<figcaption><strong>${name}</strong><p>${description}</p></figcaption></figure>`).join('')}</div><p class="hardware-guide-note">Hình linh kiện được dựng để minh họa. Các vùng dữ liệu là mô hình giảng dạy, không phải phép đo phần cứng của máy bạn.</p>`;
      document.querySelector('.dash-tabs').after(guide);
    }
    for(const[id,topic]of Object.entries(topics)){
      const purpose=purposes[id];
      const tab=$(topic.tab);tab.querySelector('.t').textContent=topic.nav;
      tab.querySelector('.n').textContent=`Demo ${['b','a','x','v','r'].indexOf(id)+1}`;
      tab.dataset.pillar=purpose.key;
      const badge=document.createElement('span');badge.className='lesson-pillar';badge.textContent=purpose.label;
      badge.title=purpose.note;tab.append(badge);
      tab.addEventListener('click',()=>{pause();active=id;render(id);});
      const root=document.createElement('section');root.className='lesson';root.id=`lesson-${id}`;root.setAttribute('aria-label',topic.title);roots[id]=root;
      root.dataset.pillar=purpose.key;
      root.innerHTML=`<div class="lesson-heading"><div><p class="lesson-purpose"><span class="lesson-pillar">${escape(purpose.label)}</span><span>${escape(purpose.note)}</span></p><h2>${escape(topic.title)}</h2></div></div><p class="lesson-intro">${escape(topic.intro)}</p>
        <div class="lesson-toolbar"><label>Ví dụ<select id="lesson-${id}-example">${exampleOptions(topic)}</select></label>${topic.algorithms?`<label>Quy tắc<select id="lesson-${id}-algorithm">${topic.algorithms.map(([value,label])=>`<option value="${value}">${escape(label)}</option>`).join('')}</select></label>`:''}</div>
        <p class="lesson-case-note"></p><div class="lesson-canvas" aria-label="Mô hình của bước hiện tại"></div>
        <details class="lesson-narration lesson-explanation" id="lesson-${id}-explanation"><summary><span class="lesson-step-summary" aria-live="polite" aria-atomic="true"><span class="lesson-current"></span><span class="lesson-title"></span></span><span class="lesson-explanation-action">Mở giải thích</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg></summary><div class="lesson-explanation-body"><p class="lesson-why"></p><p class="lesson-next"></p><p class="lesson-model-note"><b>Mô hình và máy thật.</b> ${escape(modelNotes[id])}</p><details class="lesson-history"><summary>Các bước đã xem</summary><ol class="lesson-step-log" aria-label="Chọn một bước đã xem"></ol></details></div></details>
        <div class="lesson-controls"><button id="lesson-${id}-prev" type="button">Lùi</button><button id="lesson-${id}-next" type="button" class="lesson-primary">Bước tiếp</button><button id="lesson-${id}-play" type="button" aria-pressed="false">Tự chạy</button><button id="lesson-${id}-reset" type="button">Làm lại</button><span class="lesson-count"></span></div><p class="lesson-result" hidden></p>
        <details class="lesson-settings"><summary>Tự đổi ví dụ</summary><p>${escape(topic.help)}</p><form novalidate>${topic.fields.map(([key,label,type,value])=>`<label><span class="lesson-field-label">${escape(label)}</span><input id="lesson-${id}-${key}" type="${type}" value="${escape(value)}" ${type==='number'?'min="0" step="1"':''} required></label>`).join('')}<button type="submit">Chạy ví dụ này</button></form><p class="lesson-error" id="lesson-${id}-error" role="alert" hidden></p></details>`;
      $(topic.panel).prepend(root);
      $(`lesson-${id}-example`).addEventListener('change',ev=>{
        if(ev.target.value==='custom')return;
        root.querySelector('.lesson-error').hidden=true;applyExample(id,ev.target.value);
      });
      root.querySelector('.lesson-explanation').addEventListener('toggle',event=>{
        root.querySelector('.lesson-explanation-action').textContent=event.currentTarget.open?'Thu gọn giải thích':'Mở giải thích';
      });
      root.querySelector('.lesson-step-log').addEventListener('click',event=>{
        const button=event.target.closest('button[data-step]');
        if(!button||root.dataset.invalid==='true'||root.dataset.draft==='true')return;
        pause();MemoryTeaching.seek(id,Number(button.dataset.step));
        root.querySelector(`.lesson-step-log button[data-step="${button.dataset.step}"]`)?.focus({preventScroll:true});
      });
      root.querySelector('.lesson-history').addEventListener('toggle',event=>{
        if(event.currentTarget.open)renderHistory(id,MemoryTeaching.position(id));
      });
      $(`lesson-${id}-algorithm`)?.addEventListener('change',ev=>{
        pause();root.dataset.invalid='false';root.dataset.draft='false';root.querySelector('.lesson-error').hidden=true;
        document.querySelector(`#${id==='a'?'a':'r'}-alg button[data-a="${ev.target.value}"]`).click();syncForm(id);render(id);
      });
      $(`lesson-${id}-next`).onclick=()=>{pause();MemoryTeaching.next(id);window.MemoryLessonFlow?.reveal(root.querySelector('.lesson-canvas'));};
      $(`lesson-${id}-prev`).onclick=()=>{pause();MemoryTeaching.previous(id);window.MemoryLessonFlow?.reveal(root.querySelector('.lesson-canvas'));};
      $(`lesson-${id}-play`).onclick=()=>auto(id);
      $(`lesson-${id}-reset`).onclick=()=>{
        pause();root.dataset.invalid='false';root.dataset.draft='false';root.querySelector('.lesson-error').hidden=true;
        MemoryTeaching.rewind(id);syncForm(id);render(id);
      };
      root.querySelector('form').addEventListener('submit',ev=>{ev.preventDefault();submit(id);});
      root.querySelector('form').addEventListener('input',()=>{
        pause();root.querySelector('.lesson-error').hidden=true;root.dataset.draft='true';
        ['next','prev','play'].forEach(action=>$(`lesson-${id}-${action}`).disabled=true);
        root.querySelectorAll('.lesson-step-log button').forEach(button=>button.disabled=true);
        root.querySelector('.lesson-next').textContent='Đang sửa ví dụ. Hình phía trên vẫn là dữ liệu đã áp dụng; bấm “Chạy ví dụ này” để đổi.';
      });
    }
    for(const id of Object.keys(topics))applyExample(id,topics[id].default||topics[id].examples[0][0]);
    click('t0');booting=false;
    document.querySelectorAll('.dash-tab').forEach((tab,i,tabs)=>{
      tab.tabIndex=i===0?0:-1;
      tab.addEventListener('keydown',ev=>{
        const n=ev.key==='ArrowRight'?(i+1)%tabs.length:ev.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:ev.key==='Home'?0:ev.key==='End'?tabs.length-1:-1;
        if(n>=0){ev.preventDefault();tabs[n].click();tabs[n].focus();tabs[n].scrollIntoView({block:'nearest',inline:'nearest'});}
      });
      tab.addEventListener('click',()=>tabs.forEach(t=>t.tabIndex=t===tab?0:-1));
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    // Expose only lesson pause for tests; state is provided by MemoryTeaching.
    window.MemoryLessons={pause,active:()=>active};
  }
  window.addEventListener('memory-lesson-step',ev=>{if(!booting)render(ev.detail.id);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
