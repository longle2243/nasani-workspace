(() => {
  'use strict';

  const DRAFT_KEY = 'nasani-portfolio-manager-draft-v1';
  const DATABASE_NAME = 'nasani-portfolio-manager-assets';
  const DATABASE_VERSION = 1;
  const STORE_NAME = 'images';
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const INDUSTRIES = {
    fnb: 'F&B',
    spa: 'Spa & Beauty',
    karaoke: 'Karaoke & Entertainment'
  };
  const $ = selector => document.querySelector(selector);
  const clone = value => JSON.parse(JSON.stringify(value));
  const storageStatus = $('#pm-storage-status');
  const draftStatus = $('#pm-draft-state');
  const editor = $('#pm-editor');
  const projectList = $('#pm-project-list');
  const preview = $('#pm-preview');
  let publishedContent;
  let publishedProjects;
  let content;
  let projects;
  let selectedIndustry = 'fnb';
  let database;
  let savedAt = '';
  const objectUrls = new Map();

  if (!window.WorkspaceAuth) {
    throw new Error('Workspace authentication is unavailable.');
  }
  if (!window.WorkspaceAuth.isAuthenticated()) {
    window.location.replace('./login.html');
    return;
  }

  document.body.classList.remove('auth-pending');
  $('#logoutButton').addEventListener('click', () => {
    window.WorkspaceAuth.logout();
    window.location.replace('./login.html');
  });

  function setStatus(element, message, state = 'saved') {
    element.textContent = message;
    element.dataset.state = state;
  }

  function showError(message) {
    const box = $('#pm-validation');
    box.textContent = message;
    box.hidden = false;
  }

  function clearError() {
    const box = $('#pm-validation');
    box.textContent = '';
    box.hidden = true;
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Không tải được ${url} (HTTP ${response.status}).`);
    return response.json();
  }

  function validateData(value) {
    if (!value || value.schemaVersion !== 1 || !value.industries) {
      throw new Error('content.json không đúng schema phiên bản 1.');
    }
    for (const id of Object.keys(INDUSTRIES)) {
      const industry = value.industries[id];
      if (!industry || !industry.hero || !Array.isArray(industry.sections)) {
        throw new Error(`Thiếu dữ liệu hero hoặc sections của ngành ${INDUSTRIES[id]}.`);
      }
      if (new Set(industry.sections.map(section => section.id)).size !== industry.sections.length) {
        throw new Error(`Section id của ngành ${INDUSTRIES[id]} bị trùng.`);
      }
      industry.hero.image ||= { path: '', alt: '' };
      industry.sections.forEach(section => {
        section.enabled = section.enabled !== false;
        section.image ||= { path: '', alt: '' };
      });
    }
    return value;
  }

  function normalizeProjects(value) {
    if (!value || typeof value !== 'object') throw new Error('projects.json không hợp lệ.');
    for (const id of Object.keys(INDUSTRIES)) {
      if (!Array.isArray(value[id])) throw new Error(`Thiếu danh sách dự án ngành ${INDUSTRIES[id]}.`);
      value[id].forEach((project, index) => {
        project.visible = project.visible !== false;
        project.order = Number.isFinite(project.order) ? project.order : index;
        project.thumbnail ||= { path: '', alt: '' };
        project.gallery ||= [];
        project.features ||= [];
      });
    }
    return value;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'path' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Không mở được IndexedDB.'));
    });
  }

  function assetTransaction(mode, operation) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      let result;
      try {
        result = operation(store);
      } catch (error) {
        reject(error);
        return;
      }
      transaction.oncomplete = () => resolve(result?.result);
      transaction.onerror = () => reject(transaction.error || new Error('Không thể lưu thư viện ảnh.'));
      transaction.onabort = () => reject(transaction.error || new Error('Thao tác thư viện ảnh đã bị hủy.'));
    });
  }

  async function listAssets(industry) {
    const all = await assetTransaction('readonly', store => store.getAll());
    return all.filter(asset => !industry || asset.industry === industry);
  }

  function replaceObjectUrl(path, blob) {
    const old = objectUrls.get(path);
    if (old) URL.revokeObjectURL(old);
    const url = URL.createObjectURL(blob);
    objectUrls.set(path, url);
    return url;
  }

  async function resolveAssetUrl(path) {
    const local = objectUrls.get(path);
    if (local) return local;
    const asset = await assetTransaction('readonly', store => store.get(path));
    if (asset?.blob) return replaceObjectUrl(path, asset.blob);
    return path ? `./portfolio/${path}` : '';
  }

  function getPath(root, path) {
    return path.split('.').reduce((value, key) => value?.[key], root);
  }

  function setPath(root, path, value) {
    const segments = path.split('.');
    const key = segments.pop();
    const parent = segments.reduce((current, segment) => current[segment], root);
    parent[key] = value;
  }

  function currentContent() {
    return content.industries[selectedIndustry];
  }

  function currentProjects() {
    return projects[selectedIndustry];
  }

  function encodeField(value) {
    return typeof value === 'string' ? value : '';
  }

  function makeField(label, value, options = {}) {
    const wrapper = document.createElement('label');
    wrapper.className = `pm-field${options.wide ? ' pm-wide' : ''}`;
    const title = document.createElement('span');
    title.textContent = label;
    const input = document.createElement(options.multiline ? 'textarea' : 'input');
    input.value = options.list && Array.isArray(value) ? value.join('\n') : encodeField(value);
    if (!options.multiline) input.type = options.type || 'text';
    if (options.rows) input.rows = options.rows;
    input.dataset.scope = options.scope || 'content';
    input.dataset.path = options.path;
    if (options.list) input.dataset.list = 'true';
    if (options.placeholder) input.placeholder = options.placeholder;
    wrapper.append(title, input);
    if (options.help) {
      const help = document.createElement('small');
      help.textContent = options.help;
      wrapper.append(help);
    }
    return wrapper;
  }

  function imageControl(label, image, path, scope = 'content') {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'pm-item-fields';
    const legend = document.createElement('strong');
    legend.textContent = label;
    const control = document.createElement('div');
    control.className = 'pm-image-control';
    const img = document.createElement('img');
    img.className = 'pm-image-preview';
    img.alt = image?.alt || '';
    const imagePath = image?.path || '';
    img.src = imagePath ? `./portfolio/${imagePath}` : '';
    img.hidden = !imagePath;
    const fields = document.createElement('div');
    fields.className = 'pm-image-fields';
    const upload = document.createElement('input');
    upload.type = 'file';
    upload.accept = 'image/jpeg,image/png,image/webp';
    upload.dataset.imageScope = scope;
    upload.dataset.imagePath = path;
    upload.setAttribute('aria-label', `Tải ảnh cho ${label}`);
    const alt = document.createElement('input');
    alt.type = 'text';
    alt.placeholder = 'Alt text mô tả ảnh';
    alt.value = image?.alt || '';
    alt.dataset.scope = scope;
    alt.dataset.path = `${path}.alt`;
    const pathLabel = document.createElement('span');
    pathLabel.className = 'pm-image-path';
    pathLabel.textContent = imagePath || 'Chưa chọn ảnh';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'pm-remove-image';
    remove.textContent = 'Gỡ ảnh khỏi bản nháp';
    remove.dataset.removeImage = path;
    remove.dataset.scope = scope;
    fields.append(upload, alt, pathLabel, remove);
    control.append(img, fields);
    fieldset.append(legend, control);
    return fieldset;
  }

  function stringKeys(object) {
    return Object.entries(object).filter(([key, value]) =>
      key !== 'image' && key !== 'items' && key !== 'enabled' && typeof value === 'string');
  }

  function renderEditor() {
    editor.replaceChildren();
    const page = currentContent();
    const hero = document.createElement('fieldset');
    hero.className = 'pm-fieldset';
    const heroLegend = document.createElement('legend');
    heroLegend.textContent = 'Hero section';
    hero.append(heroLegend);
    const heroGrid = document.createElement('div');
    heroGrid.className = 'pm-field-grid';
    stringKeys(page.hero).forEach(([key, value]) => {
      const labels = {
        kicker: 'Eyebrow', title: 'Tiêu đề chính', description: 'Mô tả', cta: 'Nhãn CTA',
        secondaryCta: 'CTA phụ', industries: 'Điểm nổi bật / nhóm ngành'
      };
      heroGrid.append(makeField(labels[key] || key, value, {
        path: `hero.${key}`,
        multiline: ['title', 'description'].includes(key),
        wide: ['title', 'description', 'industries'].includes(key)
      }));
    });
    hero.append(heroGrid, imageControl('Ảnh Hero', page.hero.image, 'hero.image'));
    editor.append(hero);

    page.sections.forEach((section, index) => {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'pm-fieldset';
      fieldset.dataset.sectionIndex = String(index);
      const legend = document.createElement('legend');
      legend.textContent = section.label || section.id;
      fieldset.append(legend);

      const heading = document.createElement('div');
      heading.className = 'pm-project-top';
      const enabled = document.createElement('label');
      enabled.className = 'pm-toggle';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = section.enabled !== false;
      checkbox.dataset.scope = 'content';
      checkbox.dataset.path = `sections.${index}.enabled`;
      checkbox.dataset.boolean = 'true';
      const enabledText = document.createElement('span');
      enabledText.textContent = 'Hiển thị section';
      enabled.append(checkbox, enabledText);
      const orderActions = document.createElement('div');
      orderActions.className = 'pm-project-actions';
      const up = document.createElement('button');
      up.type = 'button';
      up.textContent = '↑ Lên';
      up.dataset.sectionMove = 'up';
      up.dataset.sectionIndex = String(index);
      up.disabled = index === 0;
      const down = document.createElement('button');
      down.type = 'button';
      down.textContent = '↓ Xuống';
      down.dataset.sectionMove = 'down';
      down.dataset.sectionIndex = String(index);
      down.disabled = index === page.sections.length - 1;
      orderActions.append(up, down);
      heading.append(enabled, orderActions);
      fieldset.append(heading);

      const grid = document.createElement('div');
      grid.className = 'pm-field-grid';
      stringKeys(section).forEach(([key, value]) => {
        const labels = {
          label: 'Tên / nhãn section', title: 'Tiêu đề', intro: 'Mô tả', quote: 'Thông điệp',
          note: 'Ghi chú', cta: 'Nhãn CTA', contactUrl: 'URL liên hệ'
        };
        grid.append(makeField(labels[key] || key, value, {
          path: `sections.${index}.${key}`,
          type: key === 'contactUrl' ? 'url' : 'text',
          multiline: ['title', 'intro', 'quote', 'note'].includes(key),
          wide: true,
          help: key === 'contactUrl' ? 'Chấp nhận https://, mailto: hoặc tel:. Để trống để không hiển thị link.' : ''
        }));
      });
      fieldset.append(grid);
      fieldset.append(imageControl('Ảnh section (không bắt buộc)', section.image, `sections.${index}.image`));
      if (Array.isArray(section.items)) {
        section.items.forEach((item, itemIndex) => {
          const itemFieldset = document.createElement('fieldset');
          itemFieldset.className = 'pm-item-fields';
          const itemHeader = document.createElement('div');
          itemHeader.className = 'pm-project-top';
          const itemTitle = document.createElement('strong');
          itemTitle.textContent = `Nội dung ${itemIndex + 1}`;
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.textContent = 'Xóa mục';
          remove.dataset.removeItem = String(index);
          remove.dataset.itemIndex = String(itemIndex);
          itemHeader.append(itemTitle, remove);
          const itemGrid = document.createElement('div');
          itemGrid.className = 'pm-field-grid';
          stringKeys(item).forEach(([key, value]) => {
            const labels = { title: 'Tiêu đề', body: 'Mô tả', label: 'Nhãn', detail: 'Chi tiết' };
            itemGrid.append(makeField(labels[key] || key, value, {
              path: `sections.${index}.items.${itemIndex}.${key}`,
              multiline: ['body', 'detail'].includes(key),
              wide: true
            }));
          });
          ['steps', 'features'].forEach(key => {
            if (Array.isArray(item[key])) {
              itemGrid.append(makeField(key === 'steps' ? 'Các bước (mỗi dòng một mục)' : 'Tính năng (mỗi dòng một mục)', item[key], {
                path: `sections.${index}.items.${itemIndex}.${key}`,
                multiline: true, list: true, wide: true
              }));
            }
          });
          itemFieldset.append(itemHeader, itemGrid);
          fieldset.append(itemFieldset);
        });
        const addItem = document.createElement('button');
        addItem.type = 'button';
        addItem.className = 'button button-secondary';
        addItem.textContent = '＋ Thêm mục nội dung';
        addItem.dataset.addItem = String(index);
        fieldset.append(addItem);
      }
      editor.append(fieldset);
    });
  }

  function makeProject(industry, order) {
    return {
      name: '',
      industry: INDUSTRIES[industry],
      businessType: '',
      description: '',
      problem: '',
      solution: '',
      features: [],
      thumbnail: { path: '', alt: '' },
      gallery: [],
      url: '',
      visible: false,
      order
    };
  }

  function renderProjects() {
    projectList.replaceChildren();
    currentProjects().forEach((project, index) => {
      const card = document.createElement('article');
      card.className = 'pm-project-card';
      const top = document.createElement('div');
      top.className = 'pm-project-top';
      const title = document.createElement('strong');
      title.textContent = project.name || `Dự án ${index + 1} (chưa đặt tên)`;
      const actions = document.createElement('div');
      actions.className = 'pm-project-actions';
      [['up', '↑'], ['down', '↓'], ['delete', 'Xóa']].forEach(([action, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.dataset.action = action;
        button.dataset.projectIndex = String(index);
        if (action === 'up' && index === 0) button.disabled = true;
        if (action === 'down' && index === currentProjects().length - 1) button.disabled = true;
        actions.append(button);
      });
      top.append(title, actions);
      const visible = document.createElement('label');
      visible.className = 'pm-toggle';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = project.visible !== false;
      checkbox.dataset.scope = 'project';
      checkbox.dataset.path = `${index}.visible`;
      checkbox.dataset.boolean = 'true';
      const visibleText = document.createElement('span');
      visibleText.textContent = 'Hiển thị dự án công khai';
      visible.append(checkbox, visibleText);
      const grid = document.createElement('div');
      grid.className = 'pm-field-grid';
      const fields = [
        ['Tên dự án', 'name', false],
        ['Loại hình kinh doanh', 'businessType', false],
        ['Mô tả', 'description', true],
        ['Bài toán khách hàng', 'problem', true],
        ['Giải pháp triển khai', 'solution', true],
        ['Chức năng website (mỗi dòng một mục)', 'features', true],
        ['URL website (https://)', 'url', false]
      ];
      fields.forEach(([label, key, multiline]) => {
        grid.append(makeField(label, project[key], {
          scope: 'project', path: `${index}.${key}`,
          multiline: multiline && key !== 'features', list: key === 'features',
          wide: ['description', 'problem', 'solution', 'features'].includes(key)
        }));
      });
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = 'Hình ảnh dự án';
      details.append(summary, imageControl('Thumbnail', project.thumbnail, `${index}.thumbnail`, 'project'));
      project.gallery.forEach((image, galleryIndex) => {
        details.append(imageControl(`Ảnh chi tiết ${galleryIndex + 1}`, image, `${index}.gallery.${galleryIndex}`, 'project'));
      });
      const addGallery = document.createElement('button');
      addGallery.type = 'button';
      addGallery.className = 'button button-secondary';
      addGallery.textContent = '＋ Thêm ảnh chi tiết';
      addGallery.dataset.addGallery = String(index);
      details.append(addGallery);
      card.append(top, visible, grid, details);
      projectList.append(card);
    });
    updateOverview();
  }

  function updateDraftState() {
    const changed = JSON.stringify(content) !== JSON.stringify(publishedContent)
      || JSON.stringify(projects) !== JSON.stringify(publishedProjects);
    if (savedAt && changed) {
      setStatus(draftStatus, `Bản nháp trên thiết bị này · ${new Date(savedAt).toLocaleString('vi-VN')}`, 'dirty');
    } else if (changed) {
      setStatus(draftStatus, 'Có thay đổi chưa lưu vào bản nháp.', 'dirty');
    } else {
      setStatus(draftStatus, 'Nội dung khớp với JSON public đã tải.', 'saved');
    }
  }

  async function updateOverview() {
    const cards = $('#pm-industry-cards');
    const assets = await listAssets();
    cards.replaceChildren();
    for (const [id, name] of Object.entries(INDUSTRIES)) {
      const card = document.createElement('article');
      card.className = 'pm-industry-card';
      const dirty = JSON.stringify(content.industries[id]) !== JSON.stringify(publishedContent.industries[id])
        || JSON.stringify(projects[id]) !== JSON.stringify(publishedProjects[id]);
      card.dataset.draft = String(dirty);
      const title = document.createElement('strong');
      title.textContent = name;
      const visibleProjects = projects[id].filter(project => project.visible !== false).length;
      const imageCount = countImages(content.industries[id], projects[id]);
      const summary = document.createElement('span');
      summary.textContent = `${visibleProjects} dự án công khai · ${imageCount} ảnh tham chiếu`;
      const draft = document.createElement('span');
      draft.textContent = dirty ? `Có bản nháp · ${assets.filter(asset => asset.industry === id).length} ảnh cục bộ`
        : 'Khớp với dữ liệu public';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Chỉnh sửa ngành →';
      button.dataset.selectIndustry = id;
      card.append(title, summary, draft, button);
      cards.append(card);
    }
    updateDraftState();
  }

  function countImages(industry, industryProjects) {
    let count = industry.hero.image?.path ? 1 : 0;
    industry.sections.forEach(section => { if (section.image?.path) count += 1; });
    industryProjects.forEach(project => {
      if (project.thumbnail?.path) count += 1;
      count += project.gallery?.filter(image => image.path).length || 0;
    });
    return count;
  }

  async function saveDraft() {
    savedAt = new Date().toISOString();
    const draft = { savedAt, content, projects };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setStatus(draftStatus, `Đã lưu bản nháp trên thiết bị này · ${new Date(savedAt).toLocaleString('vi-VN')}`, 'dirty');
      clearError();
      await updateOverview();
      return true;
    } catch (error) {
      setStatus(draftStatus, 'Không thể lưu bản nháp cục bộ.', 'error');
      showError(`Không lưu được bản nháp: ${error.message}. Nội dung chưa được lưu bền vững.`);
      return false;
    }
  }

  function projectPreviewData() {
    return currentProjects().map((project, index) => ({ ...project, order: index }));
  }

  async function previewImageUrls() {
    const assets = await listAssets(selectedIndustry);
    const urls = {};
    for (const asset of assets) urls[asset.path] = await resolveAssetUrl(asset.path);
    return urls;
  }

  async function syncPreview() {
    if (!preview.contentWindow || !content) return;
    const imageUrls = await previewImageUrls();
    preview.contentWindow.postMessage({
      type: 'portfolio-manager-preview',
      industry: selectedIndustry,
      content: currentContent(),
      projects: projectPreviewData(),
      imageUrls
    }, location.origin);
  }

  function setSelectedIndustry(id) {
    if (!INDUSTRIES[id]) return;
    selectedIndustry = id;
    $('#pm-industry').value = id;
    preview.src = `./portfolio/${id}/?managerPreview=1`;
    renderEditor();
    renderProjects();
    renderImageLibrary();
    updateOverview();
  }

  function inputValue(input) {
    if (input.dataset.boolean === 'true') return input.checked;
    if (input.dataset.list === 'true') return input.value.split('\n').map(value => value.trim()).filter(Boolean);
    return input.value;
  }

  function onEditorInput(event) {
    const input = event.target.closest('[data-path]');
    if (!input) return;
    const root = input.dataset.scope === 'project' ? currentProjects() : currentContent();
    setPath(root, input.dataset.path, inputValue(input));
    if (input.dataset.scope === 'project') {
      const index = Number(input.dataset.path.split('.')[0]);
      const label = projectList.querySelector(`.pm-project-card:nth-child(${index + 1}) .pm-project-top strong`);
      if (label) label.textContent = currentProjects()[index].name || `Dự án ${index + 1} (chưa đặt tên)`;
    }
    saveDraft();
    syncPreview();
    renderImageLibrary();
  }

  function updateImageAt(path, image) {
    const target = getPath(currentContent(), path);
    if (target && typeof target === 'object' && !Array.isArray(target)) {
      target.path = image.path;
      target.alt = image.alt || '';
      return;
    }
    const projectTarget = getPath(currentProjects(), path);
    if (projectTarget && typeof projectTarget === 'object' && !Array.isArray(projectTarget)) {
      projectTarget.path = image.path;
      projectTarget.alt = image.alt || '';
      return;
    }
    throw new Error(`Không tìm thấy trường ảnh ${path}.`);
  }

  async function handleUpload(input) {
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showError('Định dạng ảnh không hỗ trợ. Chỉ nhận JPG, PNG hoặc WebP; không nhận SVG.');
      input.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showError('Ảnh vượt quá giới hạn 5 MB. Hãy nén ảnh trước khi tải lên.');
      input.value = '';
      return;
    }
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const slug = file.name.replace(/\.[^.]+$/, '').toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
    const path = `assets/uploads/${selectedIndustry}/${Date.now()}-${slug}.${extension}`;
    try {
      await assetTransaction('readwrite', store => store.put({
        path, industry: selectedIndustry, name: file.name, type: file.type, size: file.size, blob: file
      }));
      replaceObjectUrl(path, file);
      const target = input.dataset.imagePath;
      updateImageAt(target, { path, alt: getPath(input.dataset.imageScope === 'project' ? currentProjects() : currentContent(), `${target}.alt`) || '' });
      const fieldset = input.closest('.pm-image-control');
      fieldset.querySelector('.pm-image-preview').src = objectUrls.get(path);
      fieldset.querySelector('.pm-image-preview').alt = getPath(input.dataset.imageScope === 'project' ? currentProjects() : currentContent(), `${target}.alt`) || '';
      fieldset.querySelector('.pm-image-preview').hidden = false;
      fieldset.querySelector('.pm-image-path').textContent = path;
      clearError();
      await saveDraft();
      await renderImageLibrary();
      await syncPreview();
    } catch (error) {
      showError(`Không lưu được ảnh trong IndexedDB: ${error.message}`);
    } finally {
      input.value = '';
    }
  }

  function findImageReferences(path) {
    const references = [];
    Object.entries(content.industries).forEach(([industry, page]) => {
      if (page.hero.image?.path === path) references.push(`${INDUSTRIES[industry]} · Hero`);
      page.sections.forEach(section => {
        if (section.image?.path === path) references.push(`${INDUSTRIES[industry]} · ${section.label || section.id}`);
      });
    });
    Object.entries(projects).forEach(([industry, list]) => list.forEach(project => {
      if (project.thumbnail?.path === path) references.push(`${INDUSTRIES[industry]} · ${project.name || 'Dự án'} · thumbnail`);
      project.gallery?.forEach(image => {
        if (image.path === path) references.push(`${INDUSTRIES[industry]} · ${project.name || 'Dự án'} · gallery`);
      });
    }));
    return references;
  }

  async function removeImage(path) {
    const references = findImageReferences(path);
    const warning = references.length
      ? `Ảnh đang được dùng tại ${references.join(', ')}. Xóa sẽ gỡ ảnh khỏi tất cả các vị trí này trong bản nháp. Tiếp tục?`
      : 'Xóa ảnh này khỏi thư viện cục bộ?';
    if (!confirm(warning)) return;
    if (references.length) {
      Object.values(content.industries).forEach(page => {
        if (page.hero.image?.path === path) page.hero.image = { path: '', alt: '' };
        page.sections.forEach(section => {
          if (section.image?.path === path) section.image = { path: '', alt: '' };
        });
      });
      Object.values(projects).forEach(list => list.forEach(project => {
        if (project.thumbnail?.path === path) project.thumbnail = { path: '', alt: '' };
        project.gallery = project.gallery.filter(image => image.path !== path);
      }));
    }
    try {
      await assetTransaction('readwrite', store => store.delete(path));
      const url = objectUrls.get(path);
      if (url) URL.revokeObjectURL(url);
      objectUrls.delete(path);
      renderEditor();
      renderProjects();
      await saveDraft();
      await renderImageLibrary();
      await syncPreview();
    } catch (error) {
      showError(`Không xóa được ảnh: ${error.message}`);
    }
  }

  async function renderImageLibrary() {
    const root = $('#pm-image-library');
    root.replaceChildren();
    let assets;
    try {
      assets = await listAssets(selectedIndustry);
    } catch (error) {
      root.textContent = `Không thể đọc thư viện ảnh: ${error.message}`;
      return;
    }
    if (!assets.length) {
      const empty = document.createElement('p');
      empty.className = 'pm-library-empty';
      empty.textContent = 'Chưa có ảnh tải lên trong bản nháp của ngành này.';
      root.append(empty);
      return;
    }
    for (const asset of assets) {
      const row = document.createElement('div');
      row.className = 'pm-library-item';
      const image = document.createElement('img');
      image.alt = '';
      image.src = await resolveAssetUrl(asset.path);
      const detail = document.createElement('span');
      detail.textContent = `${asset.path} · ${(asset.size / 1024).toFixed(0)} KB`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Xóa';
      remove.addEventListener('click', () => removeImage(asset.path));
      row.append(image, detail, remove);
      root.append(row);
    }
  }

  function resetDraft() {
    if (!confirm('Bỏ toàn bộ bản nháp của cả ba ngành trên trình duyệt này? Ảnh trong IndexedDB sẽ được giữ lại.')) return;
    localStorage.removeItem(DRAFT_KEY);
    content = clone(publishedContent);
    projects = clone(publishedProjects);
    savedAt = '';
    clearError();
    renderEditor();
    renderProjects();
    renderImageLibrary();
    updateOverview();
    syncPreview();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function validateForExport() {
    for (const [industry, list] of Object.entries(projects)) {
      for (const project of list) {
        if (project.visible === false) continue;
        if (!project.name || !project.businessType || !project.problem || !project.solution) {
          throw new Error(`Dự án đang hiển thị trong ngành ${INDUSTRIES[industry]} cần có tên, loại hình, bài toán và giải pháp.`);
        }
        if (project.url) {
          let url;
          try { url = new URL(project.url); } catch { throw new Error(`URL website của dự án "${project.name}" không hợp lệ.`); }
          if (url.protocol !== 'https:') throw new Error('URL dự án phải dùng HTTPS.');
        }
      }
    }
    for (const [industry, page] of Object.entries(content.industries)) {
      if (!page.hero.title.trim() || !page.hero.description.trim()) {
        throw new Error(`Hero ngành ${INDUSTRIES[industry]} cần có tiêu đề và mô tả.`);
      }
      page.sections.filter(section => section.enabled).forEach(section => {
        if (section.id === 'contact' && section.contactUrl && !/^https:|^mailto:|^tel:/i.test(section.contactUrl)) {
          throw new Error(`URL liên hệ trong ngành ${INDUSTRIES[industry]} chỉ nhận HTTPS, mailto: hoặc tel:.`);
        }
      });
    }
  }

  async function openExportPanel() {
    clearError();
    try {
      validateForExport();
      const jsonLinks = $('#pm-json-downloads');
      const assetLinks = $('#pm-asset-downloads');
      jsonLinks.replaceChildren();
      assetLinks.replaceChildren();
      const jsonFiles = [
        ['content.json', content],
        ['projects.json', projects]
      ];
      jsonFiles.forEach(([name, value]) => {
        const row = document.createElement('div');
        row.className = 'pm-download-row';
        const label = document.createElement('span');
        label.textContent = `portfolio/data/${name}`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' }));
        link.download = name;
        link.textContent = `Tải ${name}`;
        row.append(label, link);
        jsonLinks.append(row);
      });
      const assets = await listAssets();
      if (assets.length) {
        for (const asset of assets) {
          const row = document.createElement('div');
          row.className = 'pm-download-row';
          const label = document.createElement('span');
          label.textContent = `portfolio/${asset.path} · ${asset.name}`;
          const link = document.createElement('a');
          link.href = URL.createObjectURL(asset.blob);
          link.download = asset.path.split('/').at(-1);
          link.textContent = 'Tải ảnh';
          row.append(label, link);
          assetLinks.append(row);
        }
      } else {
        assetLinks.textContent = 'Không có ảnh cục bộ mới cần tải.';
      }
      $('#pm-export-panel').hidden = false;
      $('#pm-export-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      showError(`Chưa thể xuất file: ${error.message}`);
    }
  }

  function addBlankItem(sectionIndex) {
    const section = currentContent().sections[sectionIndex];
    const sample = section.items?.[0];
    if (!Array.isArray(section.items)) section.items = [];
    if (sample) {
      section.items.push(Object.fromEntries(Object.entries(sample).map(([key, value]) => [
        key, Array.isArray(value) ? [] : ''
      ])));
    } else {
      section.items.push({ title: '', body: '' });
    }
  }

  function handleManagerClick(event) {
    const selectButton = event.target.closest('[data-select-industry]');
    if (selectButton) {
      setSelectedIndustry(selectButton.dataset.selectIndustry);
      return;
    }
    const moveSection = event.target.closest('[data-section-move]');
    if (moveSection) {
      const sections = currentContent().sections;
      const index = Number(moveSection.dataset.sectionIndex);
      const next = index + (moveSection.dataset.sectionMove === 'up' ? -1 : 1);
      if (next >= 0 && next < sections.length) {
        [sections[index], sections[next]] = [sections[next], sections[index]];
        saveDraft();
        renderEditor();
        syncPreview();
      }
      return;
    }
    const addItem = event.target.closest('[data-add-item]');
    if (addItem) {
      addBlankItem(Number(addItem.dataset.addItem));
      saveDraft();
      renderEditor();
      syncPreview();
      return;
    }
    const removeItem = event.target.closest('[data-remove-item]');
    if (removeItem) {
      const sectionIndex = Number(removeItem.dataset.removeItem);
      const itemIndex = Number(removeItem.dataset.itemIndex);
      if (confirm('Xóa mục nội dung này khỏi bản nháp?')) {
        currentContent().sections[sectionIndex].items.splice(itemIndex, 1);
        saveDraft();
        renderEditor();
        syncPreview();
      }
      return;
    }
    const projectAction = event.target.closest('[data-action]');
    if (projectAction) {
      const index = Number(projectAction.dataset.projectIndex);
      const list = currentProjects();
      if (projectAction.dataset.action === 'delete') {
        if (!confirm(`Xóa dự án "${list[index].name || `Dự án ${index + 1}`}" khỏi bản nháp?`)) return;
        list.splice(index, 1);
      } else {
        const next = index + (projectAction.dataset.action === 'up' ? -1 : 1);
        if (next < 0 || next >= list.length) return;
        [list[index], list[next]] = [list[next], list[index]];
      }
      list.forEach((project, order) => { project.order = order; });
      saveDraft();
      renderProjects();
      renderEditor();
      renderImageLibrary();
      syncPreview();
      return;
    }
    const addGallery = event.target.closest('[data-add-gallery]');
    if (addGallery) {
      currentProjects()[Number(addGallery.dataset.addGallery)].gallery.push({ path: '', alt: '' });
      saveDraft();
      renderProjects();
      return;
    }
    const removeImageButton = event.target.closest('[data-remove-image]');
    if (removeImageButton) {
      const path = removeImageButton.dataset.removeImage;
      const scope = removeImageButton.dataset.scope === 'project' ? currentProjects() : currentContent();
      const image = getPath(scope, path);
      if (image?.path && !confirm('Gỡ ảnh khỏi vị trí này trong bản nháp? File trong thư viện chưa bị xóa.')) return;
      if (image) { image.path = ''; image.alt = ''; }
      saveDraft();
      renderEditor();
      renderProjects();
      syncPreview();
      return;
    }
    const addProject = event.target.closest('#pm-add-project');
    if (addProject) {
      currentProjects().push(makeProject(selectedIndustry, currentProjects().length));
      saveDraft();
      renderProjects();
      renderEditor();
      return;
    }
  }

  async function initialize() {
    try {
      if (!('indexedDB' in window)) throw new Error('Trình duyệt này không hỗ trợ IndexedDB để lưu ảnh nháp.');
      database = await openDatabase();
      publishedContent = validateData(await fetchJson('./portfolio/data/content.json'));
      publishedProjects = normalizeProjects(await fetchJson('./portfolio/data/projects.json'));
      content = clone(publishedContent);
      projects = clone(publishedProjects);
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const savedContent = validateData(parsed.content);
          const savedProjects = normalizeProjects(parsed.projects);
          content = savedContent;
          projects = savedProjects;
          savedAt = parsed.savedAt || '';
        }
      } catch (error) {
        showError(`Không đọc được bản nháp cũ (${error.message}). Dữ liệu public chưa bị thay đổi; hãy xuất/sao lưu nếu cần.`);
        setStatus(draftStatus, 'Không đọc được bản nháp cũ.', 'error');
      }
      $('#pm-industry').addEventListener('change', event => setSelectedIndustry(event.target.value));
      editor.addEventListener('input', onEditorInput);
      editor.addEventListener('change', async event => {
        const fileInput = event.target.closest('[data-image-path]');
        if (fileInput) await handleUpload(fileInput);
        else onEditorInput(event);
      });
      projectList.addEventListener('input', onEditorInput);
      projectList.addEventListener('change', async event => {
        const fileInput = event.target.closest('[data-image-path]');
        if (fileInput) await handleUpload(fileInput);
        else onEditorInput(event);
      });
      document.addEventListener('click', handleManagerClick);
      $('#pm-reset').addEventListener('click', resetDraft);
      $('#pm-export').addEventListener('click', openExportPanel);
      $('#pm-close-export').addEventListener('click', () => { $('#pm-export-panel').hidden = true; });
      $('#pm-export-panel').addEventListener('click', event => {
        const link = event.target.closest('a[download]');
        if (link) {
          setStatus(draftStatus, 'Đã bắt đầu tải file. Website public chưa được cập nhật.', 'dirty');
        }
      });
      preview.addEventListener('load', syncPreview);
      setSelectedIndustry('fnb');
      setStatus(storageStatus, 'Đã tải dữ liệu public; nháp lưu cục bộ.', 'saved');
    } catch (error) {
      document.body.classList.remove('auth-pending');
      setStatus(storageStatus, `Không khởi tạo được Portfolio Manager: ${error.message}`, 'error');
      showError(`Manager chưa sẵn sàng: ${error.message}`);
      console.error('Portfolio Manager initialization failed:', error);
    }
  }

  initialize();
})();
