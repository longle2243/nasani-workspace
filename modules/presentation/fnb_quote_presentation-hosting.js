(()=>{
 "use strict";

 const DATA_URL="./data/hosting-data.json";
 const STORAGE_KEY="fnbPresentationHostingDataV1";
 const CATEGORY_LABELS={
  content:"Quản trị & cập nhật nội dung",
  design:"Thiết kế & hình ảnh",
  seo:"SEO & tối ưu website",
  tools:"Công cụ & tiện ích",
  social:"Mạng xã hội",
  advanced:"Hỗ trợ nâng cao"
 };
 const TIER_LABELS={basic:"Cơ bản",enhanced:"Nâng cao",premium:"Cao cấp",advanced:"Chăm sóc nâng cao"};
 const $=id=>document.getElementById(id);
 const clone=value=>structuredClone(value);
 const snapshot=value=>JSON.stringify(value);
 const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
 const formatMoney=value=>Number(value).toLocaleString("vi-VN")+"đ";
 let defaults=null;
 let hostingData=null;
 let selectedPlanId="";
 let activeGroupId="";
 let activeView="hosting";
 let editorDraft=null;
 let editorStartSnapshot="";
 let editorSection="plans";
 let editorGroupId="";
 let editorReturnFocus=null;

 function makeId(prefix){
  if(crypto?.randomUUID)return prefix+"-"+crypto.randomUUID();
  return prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
 }
 function orderedGroups(value=hostingData){
  return [...value.groups].sort((a,b)=>a.displayOrder-b.displayOrder);
 }
 function allPlans(value=hostingData){
  return orderedGroups(value).flatMap(group=>group.plans.map(plan=>({group,plan})));
 }
 function findPlan(id,value=hostingData){
  return allPlans(value).find(item=>item.plan.id===id)||null;
 }
 function featureById(id,value=hostingData){
  return value.benefitCatalog.find(feature=>feature.id===id)||null;
 }
 function validateHostingData(value){
  const object=item=>item!==null&&typeof item==="object"&&!Array.isArray(item);
  const text=item=>typeof item==="string"&&item.trim().length>0;
  const identifier=item=>typeof item==="string"&&/^[A-Za-z0-9_-]+$/.test(item);
  const nonNegativeInteger=item=>Number.isSafeInteger(item)&&item>=0;
  if(!object(value)||value.version!==1||!Array.isArray(value.groups)||!Array.isArray(value.benefitCatalog)){
   throw new Error("Tệp phải có version 1, groups và benefitCatalog.");
  }
  if(value.groups.length===0)throw new Error("Cần có ít nhất một nhóm Hosting.");
  const groupIds=new Set(),planIds=new Set(),featureIds=new Set();
  for(const group of value.groups){
   if(!object(group)||!identifier(group.id)||!text(group.name)||!Number.isInteger(group.displayOrder)||!Array.isArray(group.plans)){
    throw new Error("Thông tin nhóm Hosting không hợp lệ.");
   }
   if(groupIds.has(group.id))throw new Error("ID nhóm Hosting bị trùng: "+group.id);
   groupIds.add(group.id);
   for(const plan of group.plans){
    if(!object(plan)||!identifier(plan.id)||!text(plan.name)||!text(plan.storage)){
     throw new Error("Tên, dung lượng hoặc ID gói Hosting không hợp lệ.");
    }
    if(planIds.has(plan.id))throw new Error("ID gói Hosting bị trùng: "+plan.id);
    planIds.add(plan.id);
    if(!nonNegativeInteger(plan.monthlyPrice)||!nonNegativeInteger(plan.yearlyPrice)){
     throw new Error("Giá tháng và giá năm của gói "+plan.name+" phải là số nguyên không âm.");
    }
    if(!object(plan.specifications)||["bandwidth","subdomain","mysql","email","backup"].some(key=>!text(plan.specifications[key]))){
     throw new Error("Thông số của gói "+plan.name+" chưa đầy đủ.");
    }
    if(plan.care!==null){
     if(!object(plan.care)||!Array.isArray(plan.care.benefitIds)||!object(plan.care.limits)){
      throw new Error("Cấu hình chăm sóc của gói "+plan.name+" không hợp lệ.");
     }
     if(new Set(plan.care.benefitIds).size!==plan.care.benefitIds.length){
      throw new Error("Gói "+plan.name+" có quyền lợi bị lặp.");
     }
     for(const benefitId of plan.care.benefitIds){
      if(!value.benefitCatalog.some(feature=>feature.id===benefitId)){
       throw new Error("Gói "+plan.name+" đang tham chiếu quyền lợi không tồn tại: "+benefitId);
      }
     }
    }
   }
  }
  if(planIds.size===0)throw new Error("Cần có ít nhất một gói Hosting.");
  for(const feature of value.benefitCatalog){
   if(!object(feature)||!identifier(feature.id)||!text(feature.name)||!Object.hasOwn(CATEGORY_LABELS,feature.category)||!Object.hasOwn(TIER_LABELS,feature.tier)||typeof feature.description!=="string"||typeof feature.limitTemplate!=="string"){
    throw new Error("Thông tin quyền lợi chăm sóc không hợp lệ.");
   }
   if(featureIds.has(feature.id))throw new Error("ID quyền lợi bị trùng: "+feature.id);
   featureIds.add(feature.id);
  }
  for(const {plan} of allPlans(value)){
   if(plan.care===null)continue;
   for(const featureId of plan.care.benefitIds){
    const feature=value.benefitCatalog.find(item=>item.id===featureId);
    if(feature.limitTemplate&&!nonNegativeInteger(plan.care.limits[featureId])){
     throw new Error("Thiếu định mức hợp lệ cho quyền lợi “"+feature.name+"” trong gói "+plan.name+".");
    }
   }
  }
  if(!text(value.initialSelectedPlanId)||!planIds.has(value.initialSelectedPlanId)){
   throw new Error("Gói được chọn ban đầu không tồn tại.");
  }
  return value;
 }
 function showStatus(message,state="saved"){
  const status=$("hostingDataStatus");
  status.textContent=message;
  status.dataset.state=state;
 }
 function featureLimit(feature,plan){
  if(!feature.limitTemplate)return "";
  const value=plan.care?.limits?.[feature.id];
  return feature.limitTemplate.replace("{value}",Number.isInteger(value)?String(value):"—");
 }
 function renderPlanCard(group,plan){
  const selected=plan.id===selectedPlanId;
  const specs=[
   ["Băng thông",plan.specifications.bandwidth],
   ["Subdomain",plan.specifications.subdomain],
   ["MySQL",plan.specifications.mysql],
   ["Địa chỉ Mail",plan.specifications.email],
   ["Backup",plan.specifications.backup]
  ];
  return `<article class="hosting-plan-card${selected?" selected":""}${plan.care?" has-care":""}" data-plan-card="${escapeHTML(plan.id)}">
   <div class="hosting-plan-card-head"><div><span class="tag">${escapeHTML(group.name)}</span><h3>${escapeHTML(plan.name)}</h3></div>${plan.care?'<span class="hosting-care-badge">Có chăm sóc</span>':""}</div>
   <div class="hosting-plan-prices">
    <div class="hosting-price"><span>THEO THÁNG</span><strong>${formatMoney(plan.monthlyPrice)}</strong></div>
    <div class="hosting-price"><span>THEO NĂM</span><strong>${formatMoney(plan.yearlyPrice)}</strong></div>
   </div>
   <dl class="hosting-spec-list"><div><dt>Dung lượng</dt><dd>${escapeHTML(plan.storage)}</dd></div>${specs.map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`).join("")}</dl>
   <div class="hosting-plan-actions">
    <button class="hosting-select-plan" type="button" data-action="select-plan" data-plan-id="${escapeHTML(plan.id)}" aria-pressed="${selected}">${selected?"Đang xem gói":"Chọn gói"}</button>
    ${plan.care?`<button class="hosting-view-care" type="button" data-action="view-plan-care" data-plan-id="${escapeHTML(plan.id)}">Xem chăm sóc</button>`:""}
   </div>
  </article>`;
 }
 function renderHostingView(){
  const groups=orderedGroups();
  if(!groups.length){
   $("hostingDisplay").innerHTML='<div class="hosting-empty-state">Chưa có nhóm Hosting nào được cấu hình.</div>';
   return;
  }
  if(!groups.some(group=>group.id===activeGroupId))activeGroupId=groups[0].id;
  const active=groups.find(group=>group.id===activeGroupId);
  $("hostingDisplay").innerHTML=`<div class="hosting-group-panel">
   <div class="hosting-group-tabs" role="tablist" aria-label="Nhóm Hosting">${groups.map(group=>`<button class="hosting-group-tab${group.id===activeGroupId?" active":""}" type="button" role="tab" aria-selected="${group.id===activeGroupId}" data-action="select-group" data-group-id="${escapeHTML(group.id)}">${escapeHTML(group.name)} <span>(${group.plans.length})</span></button>`).join("")}</div>
   ${active.plans.length?`<div class="hosting-plan-grid">${active.plans.map(plan=>renderPlanCard(active,plan)).join("")}</div>`:'<div class="hosting-empty-state">Nhóm này chưa có gói Hosting.</div>'}
  </div>`;
 }
 function renderCareView(){
  const all=allPlans();
  if(!all.length){
   $("hostingDisplay").innerHTML='<div class="hosting-empty-state">Chưa có gói Hosting nào được cấu hình.</div>';
   return;
  }
  let selected=findPlan(selectedPlanId);
  if(!selected){
   selected=all[0];
   selectedPlanId=selected.plan.id;
  }
  const options=orderedGroups().map(group=>`<optgroup label="${escapeHTML(group.name)}">${group.plans.map(plan=>`<option value="${escapeHTML(plan.id)}"${plan.id===selected.plan.id?" selected":""}>${escapeHTML(plan.name)}</option>`).join("")}</optgroup>`).join("");
  const plan=selected.plan;
  let content;
  if(plan.care===null){
   content='<div class="hosting-empty-state">Quyền lợi chăm sóc website chưa được cấu hình cho gói này. Không có quyền lợi từ gói khác được áp dụng thay thế.</div>';
  }else{
   const assigned=plan.care.benefitIds.map(id=>featureById(id)).filter(Boolean);
   const categories=Object.keys(CATEGORY_LABELS).map(category=>{
    const features=assigned.filter(feature=>feature.category===category);
    if(!features.length)return "";
    return `<section class="hosting-benefit-group" data-tier="${features.some(feature=>feature.tier==="premium")?"premium":features.some(feature=>feature.tier!=="basic")?"enhanced":"basic"}">
     <h4>${escapeHTML(CATEGORY_LABELS[category])}</h4>
     <ul class="hosting-benefit-list">${features.map(feature=>`<li><strong>${escapeHTML(feature.name)}${feature.tier!=="basic"?` <span class="hosting-tier-label">${escapeHTML(TIER_LABELS[feature.tier]||"Bổ sung")}</span>`:""}</strong>${feature.description?`<span>${escapeHTML(feature.description)}</span>`:""}${feature.limitTemplate?`<span>${escapeHTML(featureLimit(feature,plan))}</span>`:""}</li>`).join("")}</ul>
    </section>`;
   }).join("");
   content=assigned.length?`<div class="hosting-benefit-sections">${categories}</div>`:'<div class="hosting-empty-state">Gói này chưa có quyền lợi chăm sóc nào được cấu hình.</div>';
  }
  $("hostingDisplay").innerHTML=`<div class="hosting-care-view">
   <div class="hosting-care-picker">
    <label>Chọn gói Hosting<select id="carePlanPicker" aria-label="Chọn gói Hosting để xem quyền lợi">${options}</select></label>
    <p class="hosting-care-plan-title"><strong>${escapeHTML(plan.name)} · ${escapeHTML(selected.group.name)}</strong><span>${formatMoney(plan.monthlyPrice)} / tháng · ${formatMoney(plan.yearlyPrice)} / năm</span></p>
   </div>
   ${content}
  </div>`;
 }
 function render(){
  document.querySelectorAll("[data-hosting-view]").forEach(button=>{
   const selected=button.dataset.hostingView===activeView;
   button.classList.toggle("active",selected);
   button.setAttribute("aria-selected",String(selected));
  });
  if(activeView==="care")renderCareView();
  else renderHostingView();
 }
 function setEditorStatus(message,state="saved"){
  const status=$("hostingEditorStatus");
  status.textContent=message;
  status.className="hosting-editor-status-"+state;
 }
 function refreshEditorStatus(){
  if(!editorDraft)return;
  if(snapshot(editorDraft)!==editorStartSnapshot){
   setEditorStatus("Có thay đổi chưa lưu. Bấm “Lưu thay đổi” để áp dụng, hoặc “Hủy” để bỏ thay đổi.","dirty");
  }else{
   setEditorStatus("Thay đổi chỉ lưu trong trình duyệt này cho đến khi xuất file dữ liệu.","saved");
  }
 }
 function field(label,path,value,options={}){
  const type=options.type||"text";
  const valueText=escapeHTML(value??"");
  const attribute=`data-editor-path="${escapeHTML(path)}"`;
  const control=options.multiline
   ?`<textarea ${attribute}>${valueText}</textarea>`
   :`<input ${attribute} type="${type}"${type==="number"?' min="0" step="1"':""} value="${valueText}">`;
  return `<label class="hosting-editor-field${options.full?" full":""}"><span>${escapeHTML(label)}</span>${control}</label>`;
 }
 function selectField(label,path,value,choices){
  return `<label class="hosting-editor-field"><span>${escapeHTML(label)}</span><select data-editor-path="${escapeHTML(path)}">${choices.map(([option,label])=>`<option value="${escapeHTML(option)}"${option===value?" selected":""}>${escapeHTML(label)}</option>`).join("")}</select></label>`;
 }
 function groupEditorMarkup(){
  const groups=orderedGroups(editorDraft);
  return `<h3>Nhóm Hosting</h3><p class="hosting-editor-help">Đổi tên hoặc thêm nhóm. Xóa nhóm sẽ xóa các gói trong bản nháp; thao tác chỉ có hiệu lực sau khi lưu.</p>
   <div class="hosting-editor-section">${groups.map(group=>{
    const index=editorDraft.groups.findIndex(item=>item.id===group.id);
    return `<article class="hosting-editor-card">
     <div class="hosting-editor-card-head"><strong>${escapeHTML(group.name)}</strong><button class="controlbtn" type="button" data-action="remove-group" data-group-id="${escapeHTML(group.id)}">Xóa nhóm</button></div>
     <div class="hosting-editor-row">${field("Tên nhóm",`groups.${index}.name`,group.name)}${field("Thứ tự hiển thị",`groups.${index}.displayOrder`,group.displayOrder,{type:"number"})}</div>
    </article>`;
   }).join("")}
   <button class="hosting-editor-add" type="button" data-action="add-group">+ Thêm nhóm Hosting</button></div>`;
 }
 function planEditorMarkup(){
  const groups=orderedGroups(editorDraft);
  if(!groups.some(group=>group.id===editorGroupId))editorGroupId=groups[0]?.id||"";
  const group=editorDraft.groups.find(item=>item.id===editorGroupId);
  if(!group)return '<div class="hosting-empty-state">Thêm nhóm Hosting trước khi thêm gói.</div>';
  const groupIndex=editorDraft.groups.indexOf(group);
  const groupOptions=groups.map(item=>[item.id,item.name]);
  const cards=group.plans.map((plan,planIndex)=>`
   <article class="hosting-editor-card">
    <div class="hosting-editor-card-head"><strong>${escapeHTML(plan.name||"Gói chưa đặt tên")}</strong><div><button class="controlbtn" type="button" data-action="clone-plan" data-group-id="${escapeHTML(group.id)}" data-plan-index="${planIndex}">Nhân bản</button><button class="controlbtn" type="button" data-action="remove-plan" data-group-id="${escapeHTML(group.id)}" data-plan-index="${planIndex}">Xóa</button></div></div>
    <details><summary>Thông tin gói &amp; quyền lợi</summary><div class="hosting-editor-section">
     <div class="hosting-editor-row">
      ${field("Tên gói",`groups.${groupIndex}.plans.${planIndex}.name`,plan.name)}
      ${field("Dung lượng",`groups.${groupIndex}.plans.${planIndex}.storage`,plan.storage)}
      ${field("Giá theo tháng (VNĐ)",`groups.${groupIndex}.plans.${planIndex}.monthlyPrice`,plan.monthlyPrice,{type:"number"})}
      ${field("Giá theo năm (VNĐ)",`groups.${groupIndex}.plans.${planIndex}.yearlyPrice`,plan.yearlyPrice,{type:"number"})}
      ${field("Băng thông",`groups.${groupIndex}.plans.${planIndex}.specifications.bandwidth`,plan.specifications.bandwidth)}
      ${field("Subdomain",`groups.${groupIndex}.plans.${planIndex}.specifications.subdomain`,plan.specifications.subdomain)}
      ${field("MySQL",`groups.${groupIndex}.plans.${planIndex}.specifications.mysql`,plan.specifications.mysql)}
      ${field("Địa chỉ Mail",`groups.${groupIndex}.plans.${planIndex}.specifications.email`,plan.specifications.email)}
      ${field("Backup",`groups.${groupIndex}.plans.${planIndex}.specifications.backup`,plan.specifications.backup)}
     </div>
     <label class="hosting-editor-check"><input type="checkbox" data-action="toggle-care" data-group-id="${escapeHTML(group.id)}" data-plan-index="${planIndex}"${plan.care?" checked":""}> Có quyền lợi chăm sóc website được cấu hình cho gói này</label>
     ${plan.care?renderPlanCareEditor(groupIndex,planIndex,plan):'<p class="hosting-editor-help">Gói này không có dữ liệu chăm sóc; sẽ không hiển thị quyền lợi của gói khác.</p>'}
    </div></details>
   </article>`).join("");
  return `<h3>Gói Hosting</h3><p class="hosting-editor-help">Chỉnh thông số và quyền lợi riêng theo từng gói. Gói đang chọn được giữ liên kết giữa hai mục Hosting và Chăm sóc website.</p>
   <div class="hosting-editor-group-picker"><label class="hosting-editor-field"><span>Nhóm đang chỉnh sửa</span><select data-action="select-edit-group">${groupOptions.map(([id,name])=>`<option value="${escapeHTML(id)}"${id===editorGroupId?" selected":""}>${escapeHTML(name)}</option>`).join("")}</select></label><button class="hosting-editor-add" type="button" data-action="add-plan" data-group-id="${escapeHTML(group.id)}">+ Thêm gói</button></div>
   <div class="hosting-editor-section">${cards||'<div class="hosting-empty-state">Nhóm này chưa có gói.</div>'}</div>`;
 }
 function renderPlanCareEditor(groupIndex,planIndex,plan){
  const care=plan.care;
  const included=new Set(care.benefitIds);
  const options=editorDraft.benefitCatalog.map(feature=>`<label class="hosting-benefit-option"><input type="checkbox" data-action="toggle-benefit" data-group-index="${groupIndex}" data-plan-index="${planIndex}" data-benefit-id="${escapeHTML(feature.id)}"${included.has(feature.id)?" checked":""}><span>${escapeHTML(feature.name)}<small>${escapeHTML(CATEGORY_LABELS[feature.category]||feature.category)} · ${escapeHTML(TIER_LABELS[feature.tier]||feature.tier)}</small></span></label>`).join("");
  const order=care.benefitIds.map((id,index)=>{
   const feature=featureById(id,editorDraft);
   return feature?`<div class="hosting-benefit-order-item"><span>${escapeHTML(feature.name)}</span><div><button class="controlbtn" type="button" data-action="move-benefit" data-group-index="${groupIndex}" data-plan-index="${planIndex}" data-benefit-index="${index}" data-direction="-1" aria-label="Chuyển lên">↑</button><button class="controlbtn" type="button" data-action="move-benefit" data-group-index="${groupIndex}" data-plan-index="${planIndex}" data-benefit-index="${index}" data-direction="1" aria-label="Chuyển xuống">↓</button></div></div>`:"";
  }).join("");
  const limits=care.benefitIds.map(id=>featureById(id,editorDraft)).filter(feature=>feature?.limitTemplate).map(feature=>{
   if(!Number.isInteger(care.limits[feature.id]))care.limits[feature.id]=0;
   return field(feature.name+" · định mức",`groups.${groupIndex}.plans.${planIndex}.care.limits.${feature.id}`,care.limits[feature.id],{type:"number"});
  }).join("");
  return `<div class="hosting-editor-section">
   <h4>Quyền lợi áp dụng</h4><div class="hosting-benefit-picker">${options}</div>
   <h4>Thứ tự hiển thị</h4><div class="hosting-benefit-order">${order||'<p class="hosting-editor-help">Chưa chọn quyền lợi cho gói này.</p>'}</div>
   ${limits?`<h4>Định mức theo gói</h4><div class="hosting-editor-row">${limits}</div>`:""}
  </div>`;
 }
 function benefitEditorMarkup(){
  const cards=editorDraft.benefitCatalog.map((feature,index)=>`
   <article class="hosting-editor-card">
    <div class="hosting-editor-card-head"><strong>${escapeHTML(feature.name)}</strong><div><span class="hosting-tier-label">${escapeHTML(TIER_LABELS[feature.tier]||feature.tier)}</span><button class="controlbtn" type="button" data-action="move-feature" data-feature-index="${index}" data-direction="-1" aria-label="Chuyển quyền lợi lên">↑</button><button class="controlbtn" type="button" data-action="move-feature" data-feature-index="${index}" data-direction="1" aria-label="Chuyển quyền lợi xuống">↓</button><button class="controlbtn" type="button" data-action="remove-feature" data-feature-index="${index}">Xóa</button></div></div>
    <div class="hosting-editor-row">
     ${field("Tên quyền lợi",`benefitCatalog.${index}.name`,feature.name)}
     ${selectField("Nhóm quyền lợi",`benefitCatalog.${index}.category`,feature.category,Object.entries(CATEGORY_LABELS))}
     ${field("Mô tả",`benefitCatalog.${index}.description`,feature.description,{full:true,multiline:true})}
     ${selectField("Phân loại",`benefitCatalog.${index}.tier`,feature.tier,Object.entries(TIER_LABELS))}
     ${field("Định mức (dùng {value} để chèn số)",`benefitCatalog.${index}.limitTemplate`,feature.limitTemplate)}
    </div>
   </article>`).join("");
  return `<h3>Danh mục quyền lợi</h3><p class="hosting-editor-help">Thêm/sửa quyền lợi dùng chung, rồi bật quyền lợi cần áp dụng trong từng gói. Xóa quyền lợi khỏi danh mục sẽ gỡ quyền lợi đó khỏi các gói trong bản nháp.</p><div class="hosting-editor-section">${cards}<button class="hosting-editor-add" type="button" data-action="add-feature">+ Thêm quyền lợi</button></div>`;
 }
 function renderEditor(){
  const sections=[["groups","Nhóm Hosting"],["plans","Gói & quyền lợi"],["benefits","Danh mục quyền lợi"]];
  $("hostingEditorNav").innerHTML=sections.map(([id,label])=>`<button type="button" class="${editorSection===id?"active":""}" data-editor-section="${id}">${label}</button>`).join("");
  $("hostingEditorContent").innerHTML=editorSection==="groups"?groupEditorMarkup():editorSection==="benefits"?benefitEditorMarkup():planEditorMarkup();
  refreshEditorStatus();
 }
 function updatePath(path,value){
  const parts=path.split(".");
  let target=editorDraft;
  for(const part of parts.slice(0,-1)){
   const key=/^\d+$/.test(part)?Number(part):part;
   if(target[key]===null&&part==="care")target[key]={benefitIds:[],limits:{}};
   target=target[key];
  }
  const last=parts[parts.length-1];
  target[/^\d+$/.test(last)?Number(last):last]=value;
 }
 function currentEditorPlan(groupId,index){
  const group=editorDraft.groups.find(item=>item.id===groupId);
  return group?.plans[index]||null;
 }
 function repairInitialSelectedId(){
  if(findPlan(editorDraft.initialSelectedPlanId,editorDraft))return;
  editorDraft.initialSelectedPlanId=allPlans(editorDraft)[0]?.plan.id||"";
 }
 function handleEditorAction(button){
  const action=button.dataset.action;
  const groupId=button.dataset.groupId;
  const planIndex=Number(button.dataset.planIndex);
  if(action==="add-group"){
   const id=makeId("group");
   editorDraft.groups.push({id,name:"Nhóm Hosting mới",displayOrder:editorDraft.groups.length,plans:[]});
   editorGroupId=id;
   editorSection="groups";
  }else if(action==="remove-group"){
   const group=editorDraft.groups.find(item=>item.id===groupId);
   if(editorDraft.groups.length<=1){setEditorStatus("Cần giữ lại ít nhất một nhóm Hosting.","error");return}
   if(!confirm(`Xóa nhóm “${group?.name||"Hosting"}” cùng các gói trong bản nháp?`))return;
   editorDraft.groups=editorDraft.groups.filter(item=>item.id!==groupId);
   editorDraft.groups.forEach((item,index)=>item.displayOrder=index);
   editorGroupId=editorDraft.groups[0].id;
   repairInitialSelectedId();
  }else if(action==="add-plan"){
   const group=editorDraft.groups.find(item=>item.id===groupId);
   if(!group)return;
   const plan={id:makeId("plan"),name:"Gói mới",storage:"",monthlyPrice:0,yearlyPrice:0,specifications:{bandwidth:"",subdomain:"",mysql:"",email:"",backup:""},care:null};
   group.plans.push(plan);
   editorGroupId=group.id;
  }else if(action==="clone-plan"){
   const group=editorDraft.groups.find(item=>item.id===groupId);
   const source=group?.plans[planIndex];
   if(!source)return;
   const copy=clone(source);
   copy.id=makeId("plan");
   copy.name=source.name+" (bản sao)";
   group.plans.splice(planIndex+1,0,copy);
  }else if(action==="remove-plan"){
   const group=editorDraft.groups.find(item=>item.id===groupId);
   const plan=group?.plans[planIndex];
   if(!plan)return;
   if(allPlans(editorDraft).length<=1){setEditorStatus("Cần giữ lại ít nhất một gói Hosting.","error");return}
   if(!confirm(`Xóa gói “${plan.name}” khỏi bản nháp?`))return;
   group.plans.splice(planIndex,1);
   repairInitialSelectedId();
  }else if(action==="toggle-care"){
   const plan=currentEditorPlan(groupId,planIndex);
   if(!plan)return;
   plan.care=button.checked?{benefitIds:[],limits:{}}:null;
  }else if(action==="toggle-benefit"){
   const group=editorDraft.groups[Number(button.dataset.groupIndex)];
   const plan=group?.plans[Number(button.dataset.planIndex)];
   if(!plan?.care)return;
   const id=button.dataset.benefitId;
   const index=plan.care.benefitIds.indexOf(id);
   if(button.checked&&index===-1){
    plan.care.benefitIds.push(id);
    const feature=featureById(id,editorDraft);
    if(feature?.limitTemplate&&!Number.isInteger(plan.care.limits[id]))plan.care.limits[id]=0;
   }else if(!button.checked&&index!==-1){
    plan.care.benefitIds.splice(index,1);
   }
  }else if(action==="move-benefit"){
   const plan=editorDraft.groups[Number(button.dataset.groupIndex)]?.plans[Number(button.dataset.planIndex)];
   const from=Number(button.dataset.benefitIndex),to=from+Number(button.dataset.direction);
   if(!plan?.care||to<0||to>=plan.care.benefitIds.length)return;
   [plan.care.benefitIds[from],plan.care.benefitIds[to]]=[plan.care.benefitIds[to],plan.care.benefitIds[from]];
  }else if(action==="add-feature"){
   editorDraft.benefitCatalog.push({id:makeId("benefit"),name:"Quyền lợi mới",description:"",category:"content",tier:"basic",limitTemplate:""});
  }else if(action==="remove-feature"){
   const feature=editorDraft.benefitCatalog[Number(button.dataset.featureIndex)];
   if(!feature)return;
   if(!confirm(`Xóa quyền lợi “${feature.name}” khỏi danh mục và các gói đang sử dụng?`))return;
   editorDraft.benefitCatalog.splice(Number(button.dataset.featureIndex),1);
   editorDraft.groups.forEach(group=>group.plans.forEach(plan=>{
    if(plan.care){
     plan.care.benefitIds=plan.care.benefitIds.filter(id=>id!==feature.id);
     delete plan.care.limits[feature.id];
    }
   }));
  }else if(action==="move-feature"){
   const from=Number(button.dataset.featureIndex),to=from+Number(button.dataset.direction);
   if(to<0||to>=editorDraft.benefitCatalog.length)return;
   [editorDraft.benefitCatalog[from],editorDraft.benefitCatalog[to]]=[editorDraft.benefitCatalog[to],editorDraft.benefitCatalog[from]];
  }else return;
  renderEditor();
  refreshEditorStatus();
 }
 function openEditor(){
  editorDraft=clone(hostingData);
  editorStartSnapshot=snapshot(editorDraft);
  editorSection="plans";
  editorGroupId=activeGroupId||orderedGroups(editorDraft)[0]?.id||"";
  editorReturnFocus=document.activeElement;
  renderEditor();
  $("hostingEditorOverlay").classList.add("open");
  $("hostingEditorOverlay").setAttribute("aria-hidden","false");
  $("closeHostingEditor").focus();
 }
 function closeEditor(discard=true){
  if(!editorDraft)return;
  if(discard&&snapshot(editorDraft)!==editorStartSnapshot&&!confirm("Bỏ các thay đổi chưa lưu trong bảng giá Hosting?"))return;
  editorDraft=null;
  $("hostingEditorOverlay").classList.remove("open");
  $("hostingEditorOverlay").setAttribute("aria-hidden","true");
  if(editorReturnFocus?.isConnected)editorReturnFocus.focus();
  editorReturnFocus=null;
 }
 function validateEditor(){
  for(const group of editorDraft.groups){
   for(const plan of group.plans){
    for(const key of ["monthlyPrice","yearlyPrice"])if(plan[key]===null)plan[key]=NaN;
   }
  }
  return validateHostingData(editorDraft);
 }
 function saveEditor(){
  try{
   validateEditor();
   localStorage.setItem(STORAGE_KEY,JSON.stringify(editorDraft));
   hostingData=clone(editorDraft);
   selectedPlanId=findPlan(selectedPlanId)?.plan.id||hostingData.initialSelectedPlanId;
   activeGroupId=hostingData.groups.some(group=>group.id===activeGroupId)?activeGroupId:orderedGroups()[0].id;
   editorDraft=null;
   $("hostingEditorOverlay").classList.remove("open");
   $("hostingEditorOverlay").setAttribute("aria-hidden","true");
   render();
   showStatus("Đã lưu bảng giá Hosting và quyền lợi trên trình duyệt này. Xuất dữ liệu để cập nhật file trong repository.","saved");
   if(editorReturnFocus?.isConnected)editorReturnFocus.focus();
   editorReturnFocus=null;
  }catch(error){
   setEditorStatus("Không thể lưu: "+error.message,"error");
  }
 }
 function downloadData(value){
  const contents=JSON.stringify(value,null,2);
  const blob=new Blob([contents+"\n"],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="hosting-data.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function importData(file){
  if(!file)return;
  if(!confirm("Nhập file sẽ thay thế toàn bộ dữ liệu trong bản nháp hiện tại. Tiếp tục?"))return;
  try{
   const parsed=JSON.parse(await file.text());
   validateHostingData(parsed);
   editorDraft=clone(parsed);
   editorSection="plans";
   editorGroupId=orderedGroups(editorDraft)[0]?.id||"";
   renderEditor();
   setEditorStatus("Đã nhập dữ liệu vào bản nháp. Bấm “Lưu thay đổi” để lưu trên trình duyệt.","dirty");
  }catch(error){
   setEditorStatus("Không thể nhập file: "+error.message,"error");
  }finally{
   $("hostingImportFile").value="";
  }
 }
 function bindEvents(){
  $("openHostingEditor").addEventListener("click",openEditor);
  $("closeHostingEditor").addEventListener("click",()=>closeEditor());
  $("cancelHostingEditor").addEventListener("click",()=>closeEditor());
  $("hostingEditorOverlay").addEventListener("click",event=>{
   if(event.target===$("hostingEditorOverlay"))closeEditor();
  });
  $("saveHostingEditor").addEventListener("click",saveEditor);
  $("exportHostingData").addEventListener("click",()=>{
   try{
    const candidate=editorDraft||hostingData;
    validateHostingData(candidate);
    if(editorDraft&&snapshot(editorDraft)!==editorStartSnapshot&&!confirm("Xuất cả các thay đổi chưa lưu trong bản nháp?"))return;
    downloadData(candidate);
    setEditorStatus("Đã xuất hosting-data.json. Tải file lên repository để cập nhật dữ liệu mặc định.","saved");
   }catch(error){
    setEditorStatus("Không thể xuất dữ liệu: "+error.message,"error");
   }
  });
  $("importHostingData").addEventListener("click",()=>$("hostingImportFile").click());
  $("hostingImportFile").addEventListener("change",event=>importData(event.target.files?.[0]));
  $("resetHostingData").addEventListener("click",()=>{
   if(!confirm("Khôi phục dữ liệu bảng giá mặc định? Hãy bấm Lưu thay đổi để áp dụng trên trình duyệt."))return;
   editorDraft=clone(defaults);
   editorSection="plans";
   editorGroupId=orderedGroups(editorDraft)[0]?.id||"";
   renderEditor();
   setEditorStatus("Dữ liệu mặc định đã được khôi phục trong bản nháp. Bấm “Lưu thay đổi” để áp dụng.","dirty");
  });
  $("hostingServiceTabs").addEventListener("click",event=>{
   const button=event.target.closest("[data-hosting-view]");
   if(!button)return;
   activeView=button.dataset.hostingView;
   render();
  });
  $("hostingDisplay").addEventListener("click",event=>{
   const button=event.target.closest("[data-action]");
   if(!button)return;
   if(button.dataset.action==="select-group"){
    activeGroupId=button.dataset.groupId;
    render();
   }else if(button.dataset.action==="select-plan"){
    selectedPlanId=button.dataset.planId;
    render();
   }else if(button.dataset.action==="view-plan-care"){
    selectedPlanId=button.dataset.planId;
    activeView="care";
    render();
   }
  });
  $("hostingDisplay").addEventListener("change",event=>{
   if(event.target.id==="carePlanPicker"){
    selectedPlanId=event.target.value;
    activeGroupId=findPlan(selectedPlanId)?.group.id||activeGroupId;
    render();
   }
  });
  $("hostingEditorNav").addEventListener("click",event=>{
   const button=event.target.closest("[data-editor-section]");
   if(button){editorSection=button.dataset.editorSection;renderEditor()}
  });
  $("hostingEditorContent").addEventListener("input",event=>{
   const input=event.target.closest("[data-editor-path]");
   if(!input)return;
   let value=input.value;
   if(input.type==="number")value=value===""?null:Number(value);
   updatePath(input.dataset.editorPath,value);
   refreshEditorStatus();
  });
  $("hostingEditorContent").addEventListener("change",event=>{
   const groupPicker=event.target.closest('[data-action="select-edit-group"]');
   if(groupPicker){
    editorGroupId=groupPicker.value;
    renderEditor();
    return;
   }
   const input=event.target.closest("[data-editor-path]");
   if(input){
    let value=input.value;
    if(input.type==="number")value=value===""?null:Number(value);
    if(!input.dataset.editorPath)return;
    updatePath(input.dataset.editorPath,value);
    refreshEditorStatus();
   }
   const action=event.target.closest('[data-action="toggle-care"],[data-action="toggle-benefit"]');
   if(action)handleEditorAction(action);
  });
  $("hostingEditorContent").addEventListener("click",event=>{
   const button=event.target.closest("[data-action]");
   if(button&&!button.matches('input[type="checkbox"]'))handleEditorAction(button);
  });
  document.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&$("hostingEditorOverlay").classList.contains("open"))closeEditor();
  });
 }
 async function initialize(){
  bindEvents();
  try{
   const response=await fetch(DATA_URL);
   if(!response.ok)throw new Error("HTTP "+response.status);
   defaults=validateHostingData(await response.json());
   hostingData=clone(defaults);
   const saved=localStorage.getItem(STORAGE_KEY);
   if(saved){
    try{
     const parsed=JSON.parse(saved);
     hostingData=validateHostingData(parsed);
     showStatus("Đang sử dụng bảng giá đã lưu trên trình duyệt này.","saved");
    }catch(error){
     showStatus("Dữ liệu Hosting đã lưu không hợp lệ ("+error.message+"). Đang hiển thị file mặc định; bản lưu cũ chưa bị xóa.","error");
    }
   }else{
    showStatus("Đang sử dụng dữ liệu Hosting mặc định. Thay đổi sẽ chỉ lưu trên trình duyệt này.","saved");
   }
   selectedPlanId=findPlan(hostingData.initialSelectedPlanId)?.plan.id||allPlans()[0]?.plan.id||"";
   activeGroupId=findPlan(selectedPlanId)?.group.id||orderedGroups()[0]?.id||"";
   render();
  }catch(error){
   console.error("Không thể tải dữ liệu Hosting:",error);
   $("hostingDisplay").innerHTML='<div class="hosting-empty-state">Không tải được dữ liệu bảng giá. Hãy kiểm tra file data/hosting-data.json.</div>';
   showStatus("Không tải được dữ liệu Hosting: "+error.message,"error");
   $("openHostingEditor").disabled=true;
  }
 }
 initialize();
})();
