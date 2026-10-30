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
const $=id=>document.getElementById(id);
function money(n){return Number(n||0).toLocaleString("vi-VN")+" VNĐ"}
function escapeHTML(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
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
function render(anim){
 const pkg=data.packages[data.selected]||data.packages[0];
 $("brandName").textContent=data.brand;$("footerBrand").textContent=data.brand+" · ĐỀ XUẤT DỊCH VỤ";$("footerBrand2").textContent=data.brand+" · BÁO GIÁ THIẾT KẾ WEBSITE";$("footerBrand3").textContent=data.brand+" · LỘ TRÌNH TRIỂN KHAI";
 $("heroTitle").innerHTML=escapeHTML(data.title).replace(/\n/g,"<br>");$("heroDesc").textContent=data.desc;$("scopeIntro").textContent=data.scopeIntro;
 // Màn 1: gom theo nhóm
 const groups=[];data.scope.forEach(r=>{let g=groups.find(x=>x.name===r[0]);if(!g){g={name:r[0],rows:[]};groups.push(g)}g.rows.push(r)});
 $("scopeGroups").innerHTML=groups.map((g,gi)=>`<article class="svc-group" style="--i:${gi}"><div class="svc-head"><div class="iconbox">${String.fromCharCode(65+gi)}</div><h3>${escapeHTML(g.name)}</h3></div><div class="svc-cols"><span>Hạng mục</span><span>Nội dung</span><span>Số lượng / thời gian</span></div>${g.rows.map(r=>`<div class="svc-row"><div class="svc-name">${escapeHTML(r[1])}</div><div class="svc-desc">${escapeHTML(r[2])}</div><div>${r[3]?`<span class="svc-qty">${escapeHTML(r[3])}</span>`:""}</div></div>`).join("")}</article>`).join("");
 // Màn 2
 $("priceCards").innerHTML=data.packages.map((p,i)=>`<article style="--i:${i}" class="card price-card ${p.featured?"featured":""} ${i===data.selected?"selected":""}">${p.featured?'<span class="ribbon">ĐƯỢC ĐỀ XUẤT</span>':""}<span class="tag">${i===0?"PHỔ THÔNG":i===1?"ƯA THÍCH":i===2?"CAO CẤP":"GÓI DỊCH VỤ"}</span><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.sub)}</p><div class="price">${money(p.price)}<br><small>/ phí thiết kế website</small></div><ul class="scope-list">${p.features.map(f=>`<li>${escapeHTML(f)}</li>`).join("")}</ul><button class="btn" data-package-select="${i}">${i===data.selected?"Đang chọn ✓":"Chọn gói "+escapeHTML(p.name)+" →"}</button></article>`).join("");
 // Màn 3
 $("processSteps").innerHTML=data.process.map((p,i)=>`<div class="step" style="--i:${i}"><div class="step-head"><div class="num">0${i+1}</div></div><h3>${escapeHTML(p.name)}</h3><div class="time">${escapeHTML(p.time)}</div><p>${escapeHTML(p.desc)}</p></div>`).join("");
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
  const cards=editorDraft.scope.map((item,index)=>editorCard(item[1],index,"scope",`${editorField("Nhóm dịch vụ",`scope.${index}.0`,item[0])}${editorField("Tên hạng mục",`scope.${index}.1`,item[1])}${editorField("Nội dung công việc",`scope.${index}.2`,item[2],{full:true,multiline:true})}${editorField("Số lượng / thời gian",`scope.${index}.3`,item[3],{full:true})}`)).join("");
  return `<h3>Dịch vụ &amp; hạng mục</h3><p class="editor-description">Mỗi mục gồm nhóm dịch vụ, tên, nội dung và số lượng / thời gian như trong dữ liệu JSON.</p><div class="editor-list">${cards}</div><button class="controlbtn editor-add" type="button" data-action="add-scope">+ Thêm hạng mục dịch vụ</button>`;
 }
 if(editorSection==="packages"){
  const cards=editorDraft.packages.map((pkg,index)=>editorCard(pkg.name,index,"package",`${editorField("Tên gói",`packages.${index}.name`,pkg.name)}${editorField("Giá (VNĐ)",`packages.${index}.price`,pkg.price,{type:"number",required:true})}${editorField("Mô tả ngắn",`packages.${index}.sub`,pkg.sub,{full:true})}${editorField("Hạng mục gói (mỗi dòng một mục)",`packages.${index}.features`,pkg.features.join("\n"),{full:true,multiline:true,format:"lines"})}<label class="editor-featured"><input type="checkbox" data-path="packages.${index}.featured"${pkg.featured?" checked":""}> Đánh dấu là gói được đề xuất</label>`)).join("");
  return `<h3>Gói giá</h3><p class="editor-description">Chỉnh tên, giá và quyền lợi từng gói. Gói đang chọn được thiết lập trong nhóm Thương hiệu &amp; khách hàng.</p><div class="editor-list">${cards}</div><button class="controlbtn editor-add" type="button" data-action="add-package">+ Thêm gói giá</button>`;
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
 else if(input.tagName==="SELECT")value=Number(value);
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
 if(!isObject(value))throw new Error("Dữ liệu phải là một đối tượng JSON.");
 for(const key of ["brand","client","title","desc","scopeIntro","note"])if(!string(value[key]))throw new Error(`Trường "${key}" phải là chuỗi.`);
 if(!Array.isArray(value.scope)||value.scope.some(item=>!Array.isArray(item)||item.length<4||item.slice(0,4).some(part=>!string(part))))throw new Error('Dữ liệu "scope" không đúng cấu trúc 4 trường.');
 if(!Array.isArray(value.packages)||value.packages.length===0||value.packages.some(item=>!isObject(item)||!string(item.name)||!string(item.sub)||!Number.isFinite(item.price)||item.price<0||!Array.isArray(item.features)||item.features.some(feature=>!string(feature))||typeof item.featured!=="boolean"))throw new Error('Dữ liệu "packages" không hợp lệ.');
 if(!Number.isInteger(value.selected)||value.selected<0||value.selected>=value.packages.length)throw new Error('Gói đang chọn trong "selected" không hợp lệ.');
 for(const key of ["process","payments"]){
  if(!Array.isArray(value[key])||value[key].some(item=>!isObject(item)))throw new Error(`Dữ liệu "${key}" phải là danh sách.`);
 }
 if(value.process.some(item=>!string(item.name)||!string(item.time)||!string(item.desc)))throw new Error('Các trường trong "process" phải là chuỗi.');
 if(value.payments.some(item=>!string(item.pct)||!string(item.name)||!string(item.desc)))throw new Error('Các trường trong "payments" phải là chuỗi.');
 return value;
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
 if(action==="add-scope")editorDraft.scope.push(["","","",""]);
 if(action==="add-package"){
  editorDraft.packages.push({name:"",sub:"",price:0,features:[],featured:false});
 }
 if(action==="add-payment")editorDraft.payments.push({pct:"",name:"",desc:""});
 if(action==="add-process")editorDraft.process.push({name:"",time:"",desc:""});
 if(action==="remove-scope")editorDraft.scope.splice(index,1);
 if(action==="remove-package"){
   if(editorDraft.packages.length<=1){showToast("Cần giữ lại ít nhất một gói giá.");return}
   editorDraft.packages.splice(index,1);
  if(editorDraft.selected>=editorDraft.packages.length)editorDraft.selected=Math.max(0,editorDraft.packages.length-1);
  else if(editorDraft.selected>index)editorDraft.selected--;
 }
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
 if(e.key==="ArrowRight"&&!open)go(current+1);
 if(e.key==="ArrowLeft"&&!open)go(current-1);
 if(e.key==="Escape"&&open)closeEditor();
});
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
    const candidate={...structuredClone(DEFAULTS),...parsed};
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
