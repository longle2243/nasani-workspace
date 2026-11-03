const STORE_KEY="webQuoteDataV2";
const DATA_FILE="fnb_quote_presentation-3.json";
let DEFAULTS;
let data;
let current=0;
let editorDraft=null;
let editorSection="brand";
let exportedSnapshot="";
let lastExportName="";
let loadWarning="";
let activePricingCategory="design";
let activeDemo="";
let activeDemoDevice="desktop";
let demoReturnFocus=null;
const $=id=>document.getElementById(id);
function money(n){return Number(n||0).toLocaleString("vi-VN")+" VNĐ"}
function escapeHTML(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function isSafeWebUrl(value){
 if(!value)return true;
 try{return ["http:","https:"].includes(new URL(value,window.location.href).protocol)}
 catch{return false}
}
function saveData(value){localStorage.setItem(STORE_KEY,JSON.stringify(value))}
function snapshot(value){return JSON.stringify(value)}
function setDataStatus(message,state="saved"){
 const status=$("dataStatus");
 if(!status)return;
 status.dataset.state=state;
 status.textContent=message;
}
function refreshDataStatus(){
 if(!data)return;
 if(loadWarning){
  setDataStatus(loadWarning,"error");
  return;
 }
 const isExported=snapshot(data)===exportedSnapshot;
 if(isExported){
  setDataStatus(lastExportName?"JSON đã xuất: "+lastExportName:"Dữ liệu hiện tại khớp với file JSON đã tải.", "saved");
 }else{
  setDataStatus("Đã lưu chỉnh sửa trên trình duyệt. Bạn đã chỉnh sửa nội dung; hãy xuất JSON để cập nhật file trên GitHub.","dirty");
 }
}
function pctNum(s){const n=parseFloat(String(s).replace(",","."));return isNaN(n)?0:n}
function installments(price){
 // Tính tiền theo %; đợt cuối lấy phần còn lại để tổng luôn khớp giá gói.
 const pcts=data.payments.map(p=>pctNum(p.pct));
 const sum=pcts.reduce((a,b)=>a+b,0);
 let amounts=pcts.map(p=>Math.round(price*p/100));
 if(Math.abs(sum-100)<0.001&&amounts.length){amounts[amounts.length-1]=price-amounts.slice(0,-1).reduce((a,b)=>a+b,0)}
 return {amounts,sum,total:amounts.reduce((a,b)=>a+b,0)};
}
function countUp(el,to,dur=850){
 if(window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches){el.textContent=money(to);return}
 const t0=performance.now();
 (function f(t){const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=money(Math.round(to*e));if(k<1)requestAnimationFrame(f)})(t0);
}
let enterTimer;
function replay(){
 const slides=document.querySelectorAll(".slide"),s=slides[current];
 slides.forEach(x=>x.classList.remove("enter"));void s.offsetWidth;s.classList.add("enter");
 clearTimeout(enterTimer);enterTimer=setTimeout(()=>s.classList.remove("enter"),1700);
}
function layoutServiceGrid(){
 if(!data)return;
 const count=data.scope.length;
 const columns=Math.max(1,Math.min(count||1,window.innerWidth>900?3:window.innerWidth>760?2:1));
 const rows=Math.max(1,Math.ceil(count/columns));
 $("scopeGroups").style.setProperty("--service-columns",columns);
 $("scopeGroups").style.setProperty("--service-rows",rows);
}
window.addEventListener("resize",layoutServiceGrid);
function render(anim){
 const pkg=data.packages[data.selected]||data.packages[0];
 $("brandName").textContent=data.brand;$("footerBrand").textContent=data.brand+" · ĐỀ XUẤT DỊCH VỤ";$("footerBrand2").textContent=data.brand+" · BÁO GIÁ THIẾT KẾ WEBSITE";$("footerBrand3").textContent=data.brand+" · LỘ TRÌNH TRIỂN KHAI";
 $("heroTitle").innerHTML=escapeHTML(data.title).replace(/\n/g,"<br>");$("heroDesc").textContent=data.desc;$("scopeIntro").textContent=data.scopeIntro;
 // Màn 1: mỗi nhóm gom các đầu việc liên quan thành một thẻ.
 const serviceIcons=[
  '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 9h17M7 6.8h.01M9.5 6.8h.01M8 13h8M8 16h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-5.3A2.5 2.5 0 0 1 4 13.5v-8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 8h8M8 12h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2.3" stroke="currentColor" stroke-width="1.7"/></svg>'
 ];
 $("scopeGroups").innerHTML=data.scope.map((group,index)=>`<article class="service-card" tabindex="0" style="--i:${index}"><div class="service-card-meta"><span class="iconbox" aria-hidden="true">${serviceIcons[index%serviceIcons.length]}</span><span class="tag">${escapeHTML(group.title)}</span></div><div class="service-items">${group.items.map(item=>`<div class="service-item"><h3>${escapeHTML(item.name)}</h3>${item.description?`<p class="service-description">${escapeHTML(item.description)}</p>`:""}${item.detail?`<span class="svc-qty">${escapeHTML(item.detail)}</span>`:""}</div>`).join("")}</div></article>`).join("");
 layoutServiceGrid();
 // Màn 2
 $("priceCards").innerHTML=data.packages.map((p,i)=>`<article style="--i:${i}" class="card price-card ${p.featured?"featured":""} ${i===data.selected?"selected":""}">${p.featured?'<span class="ribbon">ĐƯỢC ĐỀ XUẤT</span>':""}<span class="tag">${i===0?"PHỔ THÔNG":i===1?"ƯA THÍCH":i===2?"CAO CẤP":"GÓI DỊCH VỤ"}</span><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.sub)}</p><div class="price">${money(p.price)}<br><small>/ phí thiết kế website</small></div><ul class="scope-list">${p.features.map(f=>`<li><span>${escapeHTML(f)}</span>${previewButtons(f)}</li>`).join("")}</ul><button class="btn" data-package-select="${i}">${i===data.selected?"Đang chọn ✓":"Chọn gói "+escapeHTML(p.name)+" →"}</button></article>`).join("");
 renderPricingCategory();
 $("preDesignedPackageCards").innerHTML=data.preDesignedPackages.length
  ?data.preDesignedPackages.map((item,index)=>renderPreDesignedPackage(item,index)).join("")
  :'<p class="web-package-empty">Chưa có website thiết kế sẵn được cấu hình. Người trình bày có thể thêm mẫu, hosting và giá trong phần chỉnh sửa.</p>';
 // Màn 3
 $("processSteps").style.setProperty("--process-columns",Math.max(1,data.process.length));
 $("processSteps").innerHTML=data.process.map((p,i)=>`<div class="step" style="--i:${i}"><div class="step-head"><div class="num">${String(i+1).padStart(2,"0")}</div></div><h3>${escapeHTML(p.name)}</h3><div class="time">${escapeHTML(p.time)}</div><p>${escapeHTML(p.desc)}</p></div>`).join("");
 const inst=installments(pkg.price);
 $("payPkgLine").textContent="Gói "+pkg.name+" · "+money(pkg.price)+" (chưa gồm tên miền, hosting)";
 $("payPills").innerHTML=data.packages.map((p,i)=>`<button class="pill ${i===data.selected?"active":""}" data-package-select="${i}">${escapeHTML(p.name)}</button>`).join("");
 $("paymentRows").innerHTML=data.payments.map((p,i)=>`<div class="payitem" style="--i:${i}"><div class="pct">${escapeHTML(p.pct)}</div><strong data-v="${inst.amounts[i]}">${money(inst.amounts[i])}</strong><span>${escapeHTML(p.name)}</span><p style="font-size:11px;color:#c8d4e7;margin:7px 0 0">${escapeHTML(p.desc)}</p></div>`).join("");
 $("payTotal").textContent=money(inst.total);
 if(anim){document.querySelectorAll("#paymentRows strong[data-v]").forEach(el=>countUp(el,Number(el.dataset.v)));countUp($("payTotal"),inst.total)}
 $("payWarn").textContent=Math.abs(inst.sum-100)<0.001?"":"Lưu ý: tổng tỷ lệ các đợt đang là "+inst.sum+"%, cần bằng 100%.";
 $("processNote").textContent=data.note;
 document.querySelectorAll(".navlinks button").forEach((b,i)=>b.classList.toggle("active",i===current));
 document.querySelectorAll(".dot").forEach((d,i)=>d.classList.toggle("active",i===current));
 $("prevBtn").disabled=current===0;$("nextBtn").disabled=current===2;
 $("progressBar").style.width=((current+1)/3*100)+"%";
}
function previewButtons(feature){
 const text=feature.toLocaleLowerCase("vi");
 const types=[];
 if(/\bcơ bản\b|\bbasic\b/.test(text)&&data.featurePreviews.basic.enabled)types.push(["basic","Cơ bản"]);
 if(/\bresponsive\b/.test(text)&&data.featurePreviews.responsive.enabled)types.push(["responsive","Responsive"]);
 if(/\bssl\b/.test(text)&&data.featurePreviews.ssl.enabled)types.push(["ssl","SSL"]);
 return types.map(([type,label])=>`<button class="feature-demo-link" type="button" data-demo="${type}" aria-label="Xem minh họa ${label}">Xem minh họa</button>`).join("");
}
function renderPricingCategory(){
 const enabled=data.pricing.webPackageTabEnabled;
 if(!enabled)activePricingCategory="design";
 $("pricingTabs").hidden=!enabled;
 $("webPackageTab").hidden=!enabled;
 $("designPricingView").hidden=activePricingCategory!=="design";
 $("preDesignedPricingView").hidden=!enabled||activePricingCategory!=="preDesigned";
 $("designTab").classList.toggle("active",activePricingCategory==="design");
 $("webPackageTab").classList.toggle("active",activePricingCategory==="preDesigned");
 $("designTab").setAttribute("aria-selected",String(activePricingCategory==="design"));
 $("webPackageTab").setAttribute("aria-selected",String(enabled&&activePricingCategory==="preDesigned"));
 $("pricingEyebrow").textContent=activePricingCategory==="design"?"02 / CHI PHÍ THIẾT KẾ":"02 / WEBSITE CÓ SẴN";
 $("pricingTitle").textContent=activePricingCategory==="design"?"Chọn phương án phù hợp với mục tiêu":"Website thiết kế sẵn triển khai nhanh";
 $("pricingDescription").textContent=activePricingCategory==="design"
  ?"Ba gói thiết kế website với phạm vi khác nhau. Giá ở phần này là phí thiết kế; tên miền và hosting là các khoản chi phí riêng."
  :"Website thiết kế sẵn – triển khai nhanh – tối ưu chi phí. Hosting đi kèm theo thông tin cấu hình của từng gói.";
}
function renderPreDesignedPackage(item,index){
 const image=isSafeWebUrl(item.previewImage)?item.previewImage:"";
 const demo=isSafeWebUrl(item.demoUrl)?item.demoUrl:"";
 const price=item.price===null?"Chưa cấu hình giá":money(item.price);
 const imageMarkup=image
  ?`<div class="web-package-preview"><img class="web-package-image" src="${escapeHTML(image)}" alt="Ảnh xem trước ${escapeHTML(item.name||"website thiết kế sẵn")}" loading="lazy"><div class="web-package-image-fallback" hidden>Chưa tải được ảnh xem trước.</div></div>`
  :'<div class="web-package-preview web-package-placeholder" aria-label="Chưa có ảnh xem trước">Ảnh xem trước chưa cấu hình</div>';
 return `<article class="card web-package-card" style="--i:${index}">${imageMarkup}<span class="tag">WEBSITE CÓ SẴN</span><h3>${escapeHTML(item.name||"Website thiết kế sẵn")}</h3><p>${escapeHTML(item.description||"Chưa cấu hình mô tả.")}</p><div class="price">${price}<br><small>Giá trọn gói theo cấu hình</small></div><ul class="scope-list"><li><span><strong>Hosting đi kèm:</strong> ${escapeHTML(item.hosting||"Thông tin gói hosting chưa được cấu hình.")}</span></li><li><span><strong>Thanh toán:</strong> ${escapeHTML(item.paymentTerms)}</span></li></ul>${demo?`<a class="btn web-package-demo" href="${escapeHTML(demo)}" target="_blank" rel="noopener noreferrer">Xem website mẫu ↗</a>`:'<span class="web-package-no-demo">Chưa có liên kết xem mẫu.</span>'}</article>`;
}
function openFeatureDemo(type,trigger){
 if(!data.featurePreviews[type]?.enabled)return;
 activeDemo=type;
 activeDemoDevice="desktop";
 demoReturnFocus=trigger;
 renderFeatureDemo();
 $("demoOverlay").classList.add("open");
 $("demoOverlay").setAttribute("aria-hidden","false");
 document.body.classList.add("demo-open");
 $("closeDemo").focus();
}
function closeFeatureDemo(){
 if(!$("demoOverlay").classList.contains("open"))return;
 $("demoOverlay").classList.remove("open");
 $("demoOverlay").setAttribute("aria-hidden","true");
 document.body.classList.remove("demo-open");
 activeDemo="";
 if(demoReturnFocus?.isConnected)demoReturnFocus.focus();
 demoReturnFocus=null;
}
function renderFeatureDemo(){
 const titles={
  basic:"WEBSITE CƠ BẢN BAO GỒM NHỮNG GÌ?",
  responsive:"WEBSITE RESPONSIVE KHÁC GÌ WEBSITE THÔNG THƯỜNG?",
  ssl:"WEBSITE CÓ SSL KHÁC GÌ WEBSITE KHÔNG CÓ SSL?"
 };
 $("demoTitle").textContent=titles[activeDemo];
 if(activeDemo==="basic")$("demoContent").innerHTML=`
  <p class="demo-intro">Minh họa trực quan cho hạng mục <strong>Trang cơ bản</strong> trong gói. Bố cục và nội dung thực tế theo phạm vi đã thống nhất.</p>
  <div class="basic-site" aria-label="Minh họa bố cục trang website cơ bản">
   <div class="basic-site-nav"><strong>TÊN THƯƠNG HIỆU</strong><span>Trang chủ　 Giới thiệu　 Nội dung　 Liên hệ</span></div>
   <div class="basic-site-hero"><span>TRANG CƠ BẢN</span><strong>Khu vực giới thiệu chính</strong><i>Nội dung đại diện cho doanh nghiệp</i></div>
   <div class="basic-site-sections"><div><b>01</b><strong>Nội dung chính</strong><span>Khu vực nội dung trang</span></div><div><b>02</b><strong>Thông tin bổ sung</strong><span>Khu vực nội dung trang</span></div><div><b>03</b><strong>Liên hệ</strong><span>Thông tin theo phạm vi thực tế</span></div></div>
   <div class="basic-site-footer">CHÂN TRANG WEBSITE</div>
  </div>`;
 if(activeDemo==="responsive")$("demoContent").innerHTML=`
  <p class="demo-intro">Chọn thiết bị để so sánh cùng một nội dung ở kích thước màn hình khác nhau.</p>
  <div class="device-picker" role="group" aria-label="Chọn thiết bị xem minh họa">${[["desktop","Desktop"],["tablet","Tablet"],["mobile","Mobile"]].map(([device,label])=>`<button type="button" class="${activeDemoDevice===device?"active":""}" data-demo-device="${device}" aria-pressed="${activeDemoDevice===device}">${label}</button>`).join("")}</div>
  <div class="responsive-comparison" data-device="${activeDemoDevice}">
   ${renderResponsiveExample("fixed","WEBSITE THÔNG THƯỜNG","Kích thước cố định")}
   ${renderResponsiveExample("adaptive","WEBSITE RESPONSIVE","Bố cục tự thích ứng")}
  </div>
  <p class="demo-caption">Minh họa bằng mockup, không kết nối tới website bên ngoài.</p>`;
 if(activeDemo==="ssl")$("demoContent").innerHTML=`
  <div class="ssl-comparison">
   <article class="ssl-example ssl-insecure"><span class="ssl-status">!</span><div class="browser-bar"><span class="browser-dots">●　●　●</span><span class="address-indicator">Không bảo mật</span><span class="address-url">http://website.example</span></div><strong>HTTP · Kết nối không được mã hóa</strong><p>Thông tin trao đổi không được bảo vệ bằng mã hóa SSL/TLS.</p></article>
   <article class="ssl-example ssl-secure"><span class="ssl-status">✓</span><div class="browser-bar"><span class="browser-dots">●　●　●</span><span class="address-indicator">🔒 An toàn</span><span class="address-url">https://website.example</span></div><strong>HTTPS · Kết nối có mã hóa</strong><p>SSL/TLS mã hóa dữ liệu trao đổi giữa trình duyệt và website.</p></article>
  </div>
  <p class="demo-ssl-note">SSL giúp mã hóa dữ liệu trao đổi giữa trình duyệt và website, góp phần bảo vệ thông tin trong quá trình truy cập.</p>
  <p class="demo-caption">Mã hóa giúp bảo vệ dữ liệu khi truyền tải, không đồng nghĩa website an toàn tuyệt đối trước mọi rủi ro.</p>`;
}
function renderResponsiveExample(kind,title,subtitle){
 const fixed=kind==="fixed";
 return `<article class="responsive-example ${fixed?"is-fixed":"is-adaptive"}"><div class="responsive-example-heading"><div><strong>${title}</strong><span>${subtitle}</span></div><span class="example-indicator">${fixed?"↔":"✓"}</span></div><div class="demo-viewport"><div class="mock-browser"><span>●　●　●</span><span>example.local</span><span>⋯</span></div><div class="mock-site ${fixed?"mock-site-fixed":"mock-site-adaptive"}"><div class="mock-site-nav"><b>BRAND</b><span>TRANG CHỦ　 GIỚI THIỆU　 DỊCH VỤ　 LIÊN HỆ</span></div><div class="mock-site-hero"><div><small>GIẢI PHÁP CHO DOANH NGHIỆP</small><strong>Chào mừng bạn</strong><span>Thông tin nổi bật được trình bày rõ ràng.</span></div><i aria-hidden="true"></i></div><div class="mock-site-cards"><div><b>01</b><strong>Giới thiệu</strong></div><div><b>02</b><strong>Dịch vụ</strong></div><div><b>03</b><strong>Liên hệ</strong></div></div></div></div><p class="responsive-caption">${fixed?"Ở màn hình nhỏ, một phần nội dung có thể nằm ngoài khung xem.":"Các khối nội dung tự sắp xếp để phù hợp với màn hình."}</p></article>`;
}
function go(i){const prev=current;current=Math.max(0,Math.min(2,i));document.querySelectorAll(".slide").forEach((s,j)=>s.classList.toggle("active",j===current));render(current===2&&prev!==2);replay();window.scrollTo({top:0,behavior:"smooth"})}
function selectPackage(i,silent){
 if(!data.packages[i])return;
 data.selected=i;
 if(loadWarning){
  setDataStatus("Bản lưu trong trình duyệt không hợp lệ nên không bị ghi đè. Lựa chọn gói này chỉ áp dụng trong phiên hiện tại.","error");
 }else{
  try{saveData(data);refreshDataStatus()}
  catch(error){setDataStatus("Đã đổi gói trong phiên này nhưng không lưu được vào trình duyệt: "+error.message,"error")}
 }
 render(current===2);
 if(!silent)showToast("Đã chọn gói "+data.packages[i].name+". Bấm Tiếp theo để xem quy trình và số tiền từng đợt.");
}
document.addEventListener("click",event=>{
 const button=event.target.closest("[data-package-select]");
 if(button)selectPackage(Number(button.dataset.packageSelect),button.closest("#payPills")!==null);
});
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>go(Number(b.dataset.go))));
$("prevBtn").onclick=()=>go(current-1);$("nextBtn").onclick=()=>go(current+1);
const EDITOR_SECTIONS=[
 ["brand","Thương hiệu & khách hàng"],
 ["scope","Dịch vụ"],
 ["packages","Gói giá"],
 ["webPackages","Web gói"],
 ["featurePreviews","Minh họa"],
 ["payments","Thanh toán"],
 ["process","Quy trình"],
 ["note","Ghi chú"]
];
let editorStartSnapshot="";
function editorField(label,path,value,options={}){
 const full=options.full?" full":"";
 const escapedValue=escapeHTML(value??"");
 const attributes=`data-path="${path}"${options.format?` data-format="${options.format}"`:""}`;
 const control=options.multiline
  ?`<textarea ${attributes}>${escapedValue}</textarea>`
  :`<input ${attributes} type="${options.type||"text"}"${options.type==="number"?' min="0" step="1"':""}${options.required?' required':""} value="${escapedValue}">`;
 return `<label class="field${full}"><span class="field-label">${label}</span>${control}</label>`;
}
function editorCard(title,index,kind,fields){
 return `<article class="editor-card"><div class="editor-card-head"><strong>${escapeHTML(title||"Chưa đặt tên")}</strong><button class="controlbtn" type="button" data-action="remove-${kind}" data-index="${index}" aria-label="Xóa ${escapeHTML(title||"mục")}">Xóa</button></div><div class="editor-card-fields">${fields}</div></article>`;
}
function editorSectionMarkup(){
 if(editorSection==="brand"){
  const packageOptions=editorDraft.packages.map((pkg,index)=>`<option value="${index}"${index===editorDraft.selected?" selected":""}>${escapeHTML(pkg.name||"Gói "+(index+1))}</option>`).join("");
  return `<h3>Thông tin thương hiệu &amp; khách hàng</h3><p class="editor-description">Nội dung hiển thị ở phần mở đầu và chân trang.</p><div class="editor-fields">${editorField("Tên công ty / thương hiệu","brand",editorDraft.brand)}${editorField("Tên khách hàng / dự án","client",editorDraft.client)}${editorField("Tiêu đề chính","title",editorDraft.title,{full:true})}${editorField("Mô tả mở đầu","desc",editorDraft.desc,{full:true,multiline:true})}${editorField("Giới thiệu phạm vi dịch vụ","scopeIntro",editorDraft.scopeIntro,{full:true,multiline:true})}<label class="field"><span class="field-label">Gói đang chọn</span><select data-path="selected">${packageOptions}</select></label></div>`;
 }
 if(editorSection==="scope"){
  const cards=editorDraft.scope.map((group,index)=>{
   const items=group.items.map((item,itemIndex)=>`<article class="editor-card"><div class="editor-card-head"><strong>${escapeHTML(item.name||"Chưa đặt tên")}</strong><button class="controlbtn" type="button" data-action="remove-scope-item" data-group-index="${index}" data-index="${itemIndex}" aria-label="Xóa ${escapeHTML(item.name||"hạng mục")}">Xóa</button></div><div class="editor-card-fields">${editorField("Tên hạng mục",`scope.${index}.items.${itemIndex}.name`,item.name)}${editorField("Nội dung công việc",`scope.${index}.items.${itemIndex}.description`,item.description,{full:true,multiline:true})}${editorField("Số lượng / thời gian",`scope.${index}.items.${itemIndex}.detail`,item.detail,{full:true})}</div></article>`).join("");
   return `<section class="editor-scope-group"><h4>${escapeHTML(group.title||"Nhóm dịch vụ")}</h4>${editorField("Tên nhóm dịch vụ",`scope.${index}.title`,group.title,{full:true})}<div class="editor-list">${items}</div><button class="controlbtn editor-add" type="button" data-action="add-scope-item" data-group-index="${index}">+ Thêm đầu việc</button></section>`;
  }).join("");
  return `<h3>Dịch vụ &amp; hạng mục</h3><p class="editor-description">Chỉnh sửa các đầu việc trong từng nhóm dịch vụ. Dữ liệu được lưu và xuất theo cấu trúc nhóm.</p><div class="editor-list">${cards}</div>`;
 }
 if(editorSection==="packages"){
  const cards=editorDraft.packages.map((pkg,index)=>editorCard(pkg.name,index,"package",`${editorField("Tên gói",`packages.${index}.name`,pkg.name)}${editorField("Giá (VNĐ)",`packages.${index}.price`,pkg.price,{type:"number",required:true})}${editorField("Mô tả ngắn",`packages.${index}.sub`,pkg.sub,{full:true})}${editorField("Hạng mục gói (mỗi dòng một mục)",`packages.${index}.features`,pkg.features.join("\n"),{full:true,multiline:true,format:"lines"})}<label class="editor-featured"><input type="checkbox" data-path="packages.${index}.featured"${pkg.featured?" checked":""}> Đánh dấu là gói được đề xuất</label>`)).join("");
  return `<h3>Gói giá</h3><p class="editor-description">Chỉnh tên, giá và quyền lợi từng gói. Gói đang chọn được thiết lập trong nhóm Thương hiệu &amp; khách hàng.</p><div class="editor-list">${cards}</div><button class="controlbtn editor-add" type="button" data-action="add-package">+ Thêm gói giá</button>`;
 }
  if(editorSection==="webPackages"){
   const cards=editorDraft.preDesignedPackages.map((item,index)=>{
    const packageOptions=`<option value="">Chọn gói thiết kế đối chiếu</option>${editorDraft.packages.map((pkg,packageIndex)=>`<option value="${packageIndex}"${item.designPackageIndex===packageIndex?" selected":""}>${escapeHTML(pkg.name||"Gói "+(packageIndex+1))} · ${money(pkg.price)}</option>`).join("")}`;
    return editorCard(item.name,index,"web-package",`${editorField("Tên mẫu website",`preDesignedPackages.${index}.name`,item.name)}${editorField("Giá (VNĐ)",`preDesignedPackages.${index}.price`,item.price,{type:"number"})}<label class="field"><span class="field-label">Gói thiết kế để đối chiếu giá</span><select data-path="preDesignedPackages.${index}.designPackageIndex">${packageOptions}</select></label>${editorField("Mô tả ngắn",`preDesignedPackages.${index}.description`,item.description,{full:true,multiline:true})}${editorField("Thông tin hosting đi kèm",`preDesignedPackages.${index}.hosting`,item.hosting,{full:true})}${editorField("Ảnh xem trước (URL)",`preDesignedPackages.${index}.previewImage`,item.previewImage)}${editorField("Liên kết website mẫu (URL)",`preDesignedPackages.${index}.demoUrl`,item.demoUrl)}`);
   }).join("");
   return `<h3>Website thiết kế sẵn</h3><p class="editor-description">Tab Web gói mặc định được ẩn. Chỉ bật sau khi đã điền thông tin mẫu, hosting và giá thực tế. Để trống giá nếu chưa xác nhận; khi nhập giá, hãy chọn gói thiết kế đối chiếu và giá phải thấp hơn gói đó.</p><label class="editor-featured web-package-toggle"><input type="checkbox" data-path="pricing.webPackageTabEnabled"${editorDraft.pricing.webPackageTabEnabled?" checked":""}> Hiển thị tab Web gói</label><div class="editor-list">${cards}</div><button class="controlbtn editor-add" type="button" data-action="add-web-package">+ Thêm mẫu website</button>`;
  }
  if(editorSection==="featurePreviews"){
   return `<h3>Minh họa tính năng</h3><p class="editor-description">Bật hoặc tắt các minh họa trực quan xuất hiện cạnh tính năng tương ứng trên ba gói thiết kế.</p><div class="editor-list"><label class="editor-featured"><input type="checkbox" data-path="featurePreviews.basic.enabled"${editorDraft.featurePreviews.basic.enabled?" checked":""}> Minh họa Website cơ bản</label><label class="editor-featured"><input type="checkbox" data-path="featurePreviews.responsive.enabled"${editorDraft.featurePreviews.responsive.enabled?" checked":""}> Minh họa Responsive</label><label class="editor-featured"><input type="checkbox" data-path="featurePreviews.ssl.enabled"${editorDraft.featurePreviews.ssl.enabled?" checked":""}> Minh họa SSL</label></div>`;
  }
  if(editorSection==="payments"){
  const cards=editorDraft.payments.map((item,index)=>editorCard(item.name,index,"payment",`${editorField("Tỷ lệ",`payments.${index}.pct`,item.pct)}${editorField("Tên đợt",`payments.${index}.name`,item.name)}${editorField("Điều kiện thanh toán",`payments.${index}.desc`,item.desc,{full:true,multiline:true})}`)).join("");
  return `<h3>Thanh toán</h3><p class="editor-description">Số tiền từng đợt được tính tự động theo giá gói và tỷ lệ.</p><div class="editor-list">${cards}</div><button class="controlbtn editor-add" type="button" data-action="add-payment">+ Thêm đợt thanh toán</button>`;
 }
 if(editorSection==="process"){
  const cards=editorDraft.process.map((item,index)=>editorCard(item.name,index,"process",`${editorField("Tên giai đoạn",`process.${index}.name`,item.name)}${editorField("Thời gian",`process.${index}.time`,item.time)}${editorField("Đầu việc",`process.${index}.desc`,item.desc,{full:true,multiline:true})}`)).join("");
  return `<h3>Quy trình</h3><p class="editor-description">Các giai đoạn được trình bày theo thứ tự trong màn hình quy trình.</p><div class="editor-list">${cards}</div><button class="controlbtn editor-add" type="button" data-action="add-process">+ Thêm giai đoạn</button>`;
 }
 return `<h3>Ghi chú cuối</h3><p class="editor-description">Hiển thị dưới tiến độ thanh toán.</p><div class="editor-fields">${editorField("Nội dung ghi chú","note",editorDraft.note,{full:true,multiline:true})}</div>`;
}
function renderEditor(){
 $("editorNav").innerHTML=EDITOR_SECTIONS.map(([id,label])=>`<button type="button" class="${editorSection===id?"active":""}" data-editor-section="${id}">${label}</button>`).join("");
 $("editorContent").innerHTML=editorSectionMarkup();
 refreshEditorStatus();
}
function refreshEditorStatus(){
 if(editorDraft&&snapshot(editorDraft)!==editorStartSnapshot){
  setDataStatus("Bạn có thay đổi chưa lưu. Bấm “Lưu chỉnh sửa” để áp dụng, hoặc “Hủy” để bỏ thay đổi.","dirty");
 }else refreshDataStatus();
}
function updateEditorValue(input){
 const path=input.dataset.path.split(".");
 let value=input.value;
 if(input.type==="checkbox")value=input.checked;
 else if(input.dataset.format==="lines")value=value.split("\n").map(line=>line.trim()).filter(Boolean);
 else if(input.type==="number")value=value===""?null:Number(value);
 else if(input.tagName==="SELECT")value=value===""?null:Number(value);
 let target=editorDraft;
 path.slice(0,-1).forEach(part=>{target=target[Number.isInteger(Number(part))&&part!==""?Number(part):part]});
 const last=path[path.length-1];
 target[Number.isInteger(Number(last))&&last!==""?Number(last):last]=value;
}
function openEditor(){
 editorDraft=structuredClone(data);
 editorStartSnapshot=snapshot(editorDraft);
 editorSection="brand";
 renderEditor();
 $("editorOverlay").classList.add("open");
}
function closeEditor(discard=true){
 if(discard&&editorDraft&&snapshot(editorDraft)!==editorStartSnapshot&&!confirm("Bỏ các thay đổi chưa lưu?"))return;
 editorDraft=null;
 $("editorOverlay").classList.remove("open");
 refreshDataStatus();
}
function validateData(value){
 const isObject=item=>item!==null&&typeof item==="object"&&!Array.isArray(item);
 const string=item=>typeof item==="string";
 value=normalizeData(value);
 if(!isObject(value))throw new Error("Dữ liệu phải là một đối tượng JSON.");
 for(const key of ["brand","client","title","desc","scopeIntro","note"])if(!string(value[key]))throw new Error(`Trường "${key}" phải là chuỗi.`);
 if(!Array.isArray(value.scope)||value.scope.length!==3||value.scope.some(group=>!isObject(group)||!string(group.title)||!Array.isArray(group.items)||group.items.some(item=>!isObject(item)||!string(item.name)||!string(item.description)||!string(item.detail))))throw new Error('Dữ liệu "scope" phải gồm ba nhóm dịch vụ với các đầu việc hợp lệ.');
 if(!Array.isArray(value.packages)||value.packages.length===0||value.packages.some(item=>!isObject(item)||!string(item.name)||!string(item.sub)||!Number.isFinite(item.price)||item.price<0||!Array.isArray(item.features)||item.features.some(feature=>!string(feature))||typeof item.featured!=="boolean"))throw new Error('Dữ liệu "packages" không hợp lệ.');
 if(!Number.isInteger(value.selected)||value.selected<0||value.selected>=value.packages.length)throw new Error('Gói đang chọn trong "selected" không hợp lệ.');
 for(const key of ["process","payments"]){
  if(!Array.isArray(value[key])||value[key].some(item=>!isObject(item)))throw new Error(`Dữ liệu "${key}" phải là danh sách.`);
 }
 if(value.process.some(item=>!string(item.name)||!string(item.time)||!string(item.desc)))throw new Error('Các trường trong "process" phải là chuỗi.');
 if(value.payments.some(item=>!string(item.pct)||!string(item.name)||!string(item.desc)))throw new Error('Các trường trong "payments" phải là chuỗi.');
 if(!isObject(value.pricing)||typeof value.pricing.webPackageTabEnabled!=="boolean")throw new Error('Trường "pricing.webPackageTabEnabled" phải là boolean.');
 if(!Array.isArray(value.preDesignedPackages)||value.preDesignedPackages.some(item=>!isObject(item)||!string(item.name)||!string(item.description)||!string(item.hosting)||!string(item.previewImage)||!string(item.demoUrl)||!string(item.paymentTerms)||(item.price!==null&&(!Number.isFinite(item.price)||item.price<0))||(item.designPackageIndex!==null&&(!Number.isInteger(item.designPackageIndex)||item.designPackageIndex<0||item.designPackageIndex>=value.packages.length))))throw new Error('Dữ liệu "preDesignedPackages" không hợp lệ.');
 if(value.preDesignedPackages.some(item=>item.price!==null&&(item.designPackageIndex===null||item.price>=value.packages[item.designPackageIndex].price)))throw new Error("Giá Web gói phải thấp hơn gói thiết kế được chọn để đối chiếu.");
 if(value.preDesignedPackages.some(item=>!isSafeWebUrl(item.previewImage)||!isSafeWebUrl(item.demoUrl)))throw new Error('URL ảnh và website mẫu chỉ được dùng HTTP(S) hoặc đường dẫn web tương đối.');
 if(!isObject(value.featurePreviews)||["basic","responsive","ssl"].some(key=>!isObject(value.featurePreviews[key])||typeof value.featurePreviews[key].enabled!=="boolean"))throw new Error('Cấu hình "featurePreviews" không hợp lệ.');
 return value;
}
function normalizeData(value){
 if(value===null||typeof value!=="object"||Array.isArray(value))throw new Error("Dữ liệu phải là một đối tượng JSON.");
 const pricing=value.pricing===undefined?{}:value.pricing;
 const previews=value.featurePreviews===undefined?{}:value.featurePreviews;
 const packages=value.preDesignedPackages===undefined?[]:value.preDesignedPackages;
 if(pricing===null||typeof pricing!=="object"||Array.isArray(pricing))throw new Error('Dữ liệu "pricing" không hợp lệ.');
 if(previews===null||typeof previews!=="object"||Array.isArray(previews))throw new Error('Dữ liệu "featurePreviews" không hợp lệ.');
 if(!Array.isArray(packages))throw new Error('Dữ liệu "preDesignedPackages" phải là danh sách.');
 const previewDefaults={basic:{enabled:true},responsive:{enabled:true},ssl:{enabled:true}};
 const webPackageDefaults={name:"",description:"",hosting:"",previewImage:"",demoUrl:"",price:null,designPackageIndex:null,paymentTerms:"Thanh toán 100% một lần; không trả góp hoặc thanh toán theo mốc."};
 const scope=Array.isArray(value.scope)&&value.scope.every(item=>Array.isArray(item))
  ?(()=>{
    const groups=[{title:"WEBSITE",items:[]},{title:"FACEBOOK PAGE",items:[]},{title:"Google Map",items:[]}];
    value.scope.forEach(row=>{
     const category=String(row[0]??"");
     const group=/facebook|fanpage|page/i.test(category)?groups[1]:/website|\bweb\b/i.test(category)?groups[0]:groups[2];
     group.items.push({name:String(row[1]??""),description:String(row[2]??""),detail:String(row[3]??"")});
    });
    return groups;
   })()
  :value.scope;
 return {
  ...value,
  scope,
  pricing:{webPackageTabEnabled:false,...pricing},
  featurePreviews:Object.fromEntries(Object.entries(previewDefaults).map(([key,defaults])=>{
   const configured=previews[key];
   if(configured===undefined)return [key,{...defaults}];
   if(configured===null||typeof configured!=="object"||Array.isArray(configured))return [key,configured];
   return [key,{...defaults,...configured}];
  })),
  preDesignedPackages:packages.map(item=>item&&typeof item==="object"&&!Array.isArray(item)?{...webPackageDefaults,...item}:item)
 };
}
function saveEditor(){
 try{
  validateData(editorDraft);
  const next=structuredClone(editorDraft);
  data=next;
  let storageError=null;
  try{saveData(data)}catch(error){storageError=error}
  loadWarning="";
  render();
  editorDraft=null;
  $("editorOverlay").classList.remove("open");
  if(storageError){
   setDataStatus("Đã áp dụng thay đổi cho phiên này nhưng không lưu được vào trình duyệt: "+storageError.message,"error");
   showToast("Không lưu được dữ liệu vào trình duyệt.");
  }else{
   refreshDataStatus();
   showToast("Đã lưu chỉnh sửa trên trình duyệt.");
  }
 }catch(error){
  setDataStatus("Không thể lưu: "+error.message,"error");
  showToast("Không thể lưu nội dung. Vui lòng kiểm tra dữ liệu.");
 }
}
function exportData(){
 if(editorDraft&&snapshot(editorDraft)!==editorStartSnapshot){
  setDataStatus("Có thay đổi chưa lưu. Hãy bấm “Lưu chỉnh sửa” trước khi xuất JSON.","error");
  return;
 }
 try{
  validateData(data);
  const contents=JSON.stringify(data,null,2);
  JSON.parse(contents);
  const blob=new Blob([contents+"\n"],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download=DATA_FILE;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  exportedSnapshot=snapshot(data);
  lastExportName=DATA_FILE;
  refreshDataStatus();
  showToast("Đã xuất file "+DATA_FILE+". Hãy tự tải file này lên GitHub.");
 }catch(error){
  setDataStatus("Xuất JSON thất bại: "+error.message,"error");
  showToast("Không thể xuất JSON.");
 }
}
$("openEditor").onclick=openEditor;
$("closeEditor").onclick=()=>closeEditor();
$("cancelBtn").onclick=()=>closeEditor();
$("editorOverlay").addEventListener("click",event=>{if(event.target===$("editorOverlay"))closeEditor()});
$("editorNav").addEventListener("click",event=>{
 const button=event.target.closest("[data-editor-section]");
 if(button){editorSection=button.dataset.editorSection;renderEditor()}
});
$("editorContent").addEventListener("input",event=>{
 const input=event.target.closest("[data-path]");
 if(input){updateEditorValue(input);refreshEditorStatus()}
});
$("editorContent").addEventListener("change",event=>{
 const input=event.target.closest("[data-path]");
 if(input){updateEditorValue(input);refreshEditorStatus()}
});
$("editorContent").addEventListener("click",event=>{
 const button=event.target.closest("[data-action]");
 if(!button)return;
 const action=button.dataset.action,index=Number(button.dataset.index);
 const groupIndex=Number(button.dataset.groupIndex);
 if(action==="add-scope-item")editorDraft.scope[groupIndex].items.push({name:"",description:"",detail:""});
 if(action==="add-package"){
  editorDraft.packages.push({name:"",sub:"",price:0,features:[],featured:false});
 }
 if(action==="add-web-package"){
  editorDraft.preDesignedPackages.push({name:"",description:"",hosting:"",previewImage:"",demoUrl:"",price:null,designPackageIndex:null,paymentTerms:"Thanh toán 100% một lần; không trả góp hoặc thanh toán theo mốc."});
 }
 if(action==="add-payment")editorDraft.payments.push({pct:"",name:"",desc:""});
 if(action==="add-process")editorDraft.process.push({name:"",time:"",desc:""});
 if(action==="remove-scope-item")editorDraft.scope[groupIndex].items.splice(index,1);
 if(action==="remove-package"){
   if(editorDraft.packages.length<=1){showToast("Cần giữ lại ít nhất một gói giá.");return}
   editorDraft.packages.splice(index,1);
  editorDraft.preDesignedPackages.forEach(item=>{
   if(item.designPackageIndex===index)item.designPackageIndex=null;
   else if(item.designPackageIndex>index)item.designPackageIndex--;
  });
  if(editorDraft.selected>=editorDraft.packages.length)editorDraft.selected=Math.max(0,editorDraft.packages.length-1);
  else if(editorDraft.selected>index)editorDraft.selected--;
 }
 if(action==="remove-web-package")editorDraft.preDesignedPackages.splice(index,1);
 if(action==="remove-payment")editorDraft.payments.splice(index,1);
 if(action==="remove-process")editorDraft.process.splice(index,1);
 renderEditor();
});
$("saveBtn").onclick=saveEditor;
$("exportBtn").onclick=exportData;
$("resetBtn").onclick=()=>{
 if(!confirm("Khôi phục toàn bộ nội dung theo file JSON mẫu?"))return;
 data=structuredClone(DEFAULTS);
 editorDraft=structuredClone(data);
 editorStartSnapshot=snapshot(editorDraft);
 try{
  saveData(data);
  loadWarning="";
  render();
  renderEditor();
  refreshDataStatus();
  showToast("Đã khôi phục dữ liệu mẫu. Hãy xuất JSON nếu muốn cập nhật file.");
 }catch(error){
  render();
  renderEditor();
  setDataStatus("Đã khôi phục trong phiên này nhưng không lưu được vào trình duyệt: "+error.message,"error");
 }
};
$("printBtn").onclick=()=>window.print();
let toastTimer;function showToast(msg){$("toast").textContent=msg;$("toast").style.display="block";clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").style.display="none",3200)}
document.addEventListener("keydown",e=>{
 const open=$("editorOverlay").classList.contains("open");
 const demoOpen=$("demoOverlay").classList.contains("open");
 if(e.key==="ArrowRight"&&!open&&!demoOpen)go(current+1);
 if(e.key==="ArrowLeft"&&!open&&!demoOpen)go(current-1);
 if(e.key==="Escape"&&open)closeEditor();
 else if(e.key==="Escape"&&demoOpen)closeFeatureDemo();
});
document.addEventListener("click",event=>{
 const demoButton=event.target.closest("[data-demo]");
 if(demoButton){openFeatureDemo(demoButton.dataset.demo,demoButton);return}
 const categoryButton=event.target.closest("[data-pricing-category]");
 if(categoryButton){
  if(categoryButton.dataset.pricingCategory==="preDesigned"&&!data.pricing.webPackageTabEnabled)return;
  activePricingCategory=categoryButton.dataset.pricingCategory;
  renderPricingCategory();
 }
 const deviceButton=event.target.closest("[data-demo-device]");
 if(deviceButton&&activeDemo==="responsive"){
  activeDemoDevice=deviceButton.dataset.demoDevice;
  renderFeatureDemo();
 }
});
$("closeDemo").addEventListener("click",closeFeatureDemo);
$("demoOverlay").addEventListener("click",event=>{if(event.target===$("demoOverlay"))closeFeatureDemo()});
$("preDesignedPackageCards").addEventListener("error",event=>{
 if(event.target.matches(".web-package-image")){
  event.target.hidden=true;
  event.target.nextElementSibling.hidden=false;
 }
},true);
async function loadDefaults(){
 try{
  const response=await fetch("./"+DATA_FILE);
  if(!response.ok)throw new Error("HTTP "+response.status);
  DEFAULTS=validateData(await response.json());
  data=structuredClone(DEFAULTS);
  exportedSnapshot=snapshot(DEFAULTS);
  try{
   const saved=localStorage.getItem(STORE_KEY);
   if(saved){
    const parsed=JSON.parse(saved);
    if(parsed===null||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Dữ liệu đã lưu không phải đối tượng JSON.");
    const candidate=normalizeData({...structuredClone(DEFAULTS),...parsed});
    try{data=validateData(candidate)}
    catch(error){loadWarning="Dữ liệu lưu trong trình duyệt không hợp lệ ("+error.message+"). Đang dùng file JSON gốc; bản lưu cũ chưa bị xóa."}
   }
  }catch(error){
   loadWarning="Không đọc được dữ liệu lưu trong trình duyệt ("+error.message+"). Đang dùng file JSON gốc; dữ liệu lưu cũ chưa bị xóa."
  }
  refreshDataStatus();
  render();replay();
 }catch(error){
  console.error("Không thể tải dữ liệu báo giá:",error);
  const loadError=$("loadError");
  loadError.hidden=false;
  loadError.textContent="Không tải được dữ liệu báo giá hợp lệ: "+error.message+". Hãy kiểm tra file "+DATA_FILE+"; file gốc không bị thay đổi.";
 }
}
loadDefaults();
