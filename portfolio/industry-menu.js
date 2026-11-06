(async () => {
  'use strict';

  const toggle = document.querySelector('.industry-toggle');
  const menu = document.querySelector('#industry-menu');
  const main = document.querySelector('main');
  if (!toggle || !menu || !main) {
    throw new Error('Portfolio page is missing its main content or industry navigation.');
  }

  const items = [...menu.querySelectorAll('a')];
  const authenticated = window.WorkspaceAuth?.isAuthenticated() === true;
  document.querySelectorAll('.portfolio-login-link').forEach(link => { link.hidden = authenticated; });
  document.querySelectorAll('.portfolio-workspace-link').forEach(link => { link.hidden = !authenticated; });

  const readData = async path => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP ${response.status} while loading ${path}`);
    return response.json();
  };
  const setText = (element, value) => {
    if (element && typeof value === 'string') element.textContent = value;
  };
  const setLines = (element, value, emphasisLine = -1) => {
    if (!element || typeof value !== 'string') return;
    const lines = value.split('\n');
    element.replaceChildren();
    lines.forEach((line, index) => {
      if (index) element.append(document.createElement('br'));
      if (index === emphasisLine) {
        const emphasis = document.createElement('em');
        emphasis.textContent = line;
        element.append(emphasis);
      } else {
        element.append(document.createTextNode(line));
      }
    });
  };
  const setList = (container, values, buildItem) => {
    if (!container || !Array.isArray(values)) return;
    container.replaceChildren(...values.map(buildItem));
  };
  let previewAssetUrls = {};
  const reorderSections = page => {
    const hero = main?.querySelector('[data-portfolio-hero]');
    if (!main || !hero) return;
    page.sections.forEach(section => {
      const root = main.querySelector(`[data-portfolio-section="${section.id}"]`);
      if (root) main.append(root);
    });
    main.prepend(hero);
  };
  const assetUrl = value => {
    if (typeof value !== 'string' || !value || value.startsWith('/') || value.includes('..')) return '';
    if (previewAssetUrls[value]) return previewAssetUrls[value];
    return value.startsWith('assets/') ? new URL(`../${value}`, location.href).href : '';
  };
  const setSectionImage = (root, image) => {
    root.querySelector('.portfolio-section-image')?.remove();
    const src = assetUrl(image?.path);
    if (!src) return;
    const figure = document.createElement('figure');
    figure.className = 'portfolio-section-image';
    const img = document.createElement('img');
    img.src = src;
    img.alt = image.alt || '';
    img.loading = 'lazy';
    figure.append(img);
    root.insertBefore(figure, root.children[1] || null);
  };
  const setHero = (industry, hero) => {
    const root = document.querySelector('[data-portfolio-hero]');
    if (!root || !hero) return;
    setText(root.querySelector('[data-hero-kicker]'), hero.kicker);
    setLines(root.querySelector('h1'), hero.title, 1);
    setText(root.querySelector('[data-hero-description]'), hero.description);
    setText(root.querySelector('[data-hero-industries]'), hero.industries);
    setText(root.querySelector('[data-hero-cta]'), hero.cta);
    setText(root.querySelector('[data-hero-secondary]'), hero.secondaryCta);
    const image = root.querySelector('.portfolio-custom-image');
    const fallback = root.querySelector('svg');
    const src = assetUrl(hero.image?.path);
    if (image && fallback) {
      image.hidden = !src;
      fallback.hidden = Boolean(src);
      if (src) {
        image.src = src;
        image.alt = hero.image.alt || '';
      } else {
        image.removeAttribute('src');
        image.alt = '';
      }
    }
  };
  const renderSection = (industry, section) => {
    const root = document.querySelector(`[data-portfolio-section="${section.id}"]`);
    if (!root) return;
    root.hidden = section.enabled === false;
    setSectionImage(root, section.image);

    if (industry === 'fnb') {
      if (section.id === 'challenge') {
        setText(root.querySelector('.fnb-section-label p'), section.label);
        setLines(root.querySelector('.fnb-issue-heading h2'), section.title, 1);
        setText(root.querySelector('.fnb-issue-heading>p'), section.intro);
        setList(root.querySelector('.fnb-issue-list'), section.items, item => {
          const article = document.createElement('article');
          const number = document.createElement('span');
          number.textContent = String(section.items.indexOf(item) + 1).padStart(2, '0');
          const title = document.createElement('h3');
          title.textContent = item.title;
          const body = document.createElement('p');
          body.textContent = item.body;
          article.append(number, title, body);
          return article;
        });
      } else if (section.id === 'solutions') {
        setText(root.querySelector('.fnb-section-label p'), section.label);
        setLines(root.querySelector('h2'), section.title, 1);
        setText(root.querySelector('.fnb-offer-intro'), section.intro);
        setList(root.querySelector('.fnb-journeys'), section.items, item => {
          const article = document.createElement('article');
          article.className = 'fnb-journey';
          const tag = document.createElement('p');
          tag.className = 'journey-tag';
          tag.append(document.createTextNode(`HÀNH TRÌNH ${String(section.items.indexOf(item) + 1).padStart(2, '0')} `));
          const category = document.createElement('span');
          category.textContent = item.label;
          tag.append(category);
          const title = document.createElement('h3');
          title.textContent = item.title;
          const steps = document.createElement('ol');
          setList(steps, item.steps, value => {
            const li = document.createElement('li');
            li.textContent = value;
            return li;
          });
          const goal = document.createElement('p');
          goal.className = 'journey-end';
          goal.textContent = item.detail;
          article.append(tag, title, steps, goal);
          return article;
        });
        setText(root.querySelector('.fnb-link-light'), section.cta);
      } else if (section.id === 'work') {
        setText(root.querySelector('.fnb-section-label p'), section.label);
        setLines(root.querySelector('.fnb-work-heading h2'), section.title, 1);
        setText(root.querySelector('.fnb-work-heading>p'), section.intro);
      } else if (section.id === 'approach') {
        setText(root.querySelector('.fnb-section-label>span:last-child'), section.label);
        setText(root.querySelector('blockquote'), section.quote);
        setText(root.querySelector('.fnb-thinking-note p'), section.note);
      } else if (section.id === 'process') {
        setText(root.querySelector('.fnb-section-label p'), section.label);
        setLines(root.querySelector('h2'), section.title);
        setList(root.querySelector('.fnb-steps'), section.items, (item, index) => {
          const article = document.createElement('article');
          const number = document.createElement('span');
          number.textContent = String(index + 1).padStart(2, '0');
          const title = document.createElement('h3');
          title.textContent = item.title;
          const body = document.createElement('p');
          body.textContent = item.body;
          article.append(number, title, body);
          return article;
        });
      } else if (section.id === 'contact') {
        setText(root.querySelector('.fnb-kicker'), section.label);
        setLines(root.querySelector('h2'), section.title);
        setText(root.querySelector('.contact-placeholder'), section.description);
        setText(root.querySelector('.fnb-contact-action'), section.cta);
        const link = root.querySelector('[data-contact-link]');
        const placeholder = root.querySelector('.contact-placeholder-link');
        if (link) {
          const href = safeContactUrl(section.contactUrl);
          link.href = href || '#';
          link.hidden = !href;
          if (placeholder) placeholder.hidden = Boolean(href);
          setText(link.querySelector('[data-contact-label]'), section.cta);
        }
      }
    } else if (industry === 'spa') {
      if (section.id === 'approach') {
        setText(root.querySelector('.spa-kicker'), section.label);
        setLines(root.querySelector('h2'), section.title, 1);
        setText(root.querySelector('p:last-of-type'), section.intro);
      } else if (section.id === 'solutions') {
        setText(root.querySelector('.spa-experience-heading>span'), section.label);
        setLines(root.querySelector('h2'), section.title);
        setList(root.querySelector('.spa-experience-grid'), section.items, (item, index) => {
          const article = document.createElement('article');
          article.className = 'spa-service';
          const number = document.createElement('span');
          number.textContent = String(index + 1).padStart(2, '0');
          const content = document.createElement('div');
          const title = document.createElement('h3');
          title.textContent = item.title;
          const body = document.createElement('p');
          body.textContent = item.body;
          content.append(title, body);
          const arrow = document.createElement('b');
          arrow.setAttribute('aria-hidden', 'true');
          arrow.textContent = '↗';
          article.append(number, content, arrow);
          return article;
        });
      } else if (section.id === 'booking') {
        setText(root.querySelector('.spa-ritual-copy .spa-kicker'), section.label);
        setLines(root.querySelector('h2'), section.title, 1);
        setText(root.querySelector('.spa-ritual-copy>p:not(.spa-kicker)'), section.intro);
        setText(root.querySelector('.spa-ritual-copy>a'), section.cta);
        setList(root.querySelector('.spa-ritual-steps'), section.items, (item, index) => {
          const li = document.createElement('li');
          const number = document.createElement('span');
          number.textContent = String(index + 1).padStart(2, '0');
          const content = document.createElement('div');
          const title = document.createElement('b');
          title.textContent = item.title;
          const detail = document.createElement('small');
          detail.textContent = item.detail;
          content.append(title, detail);
          li.append(number, content);
          return li;
        });
      } else if (section.id === 'work') {
        setText(root.querySelector('.spa-section-head>span'), section.label);
        setLines(root.querySelector('.spa-section-head h2'), section.title);
        setText(root.querySelector('.spa-section-head>p'), section.intro);
      } else if (section.id === 'process') {
        setText(root.querySelector('.spa-kicker'), section.label);
        setLines(root.querySelector('h2'), section.title);
        setList(root.querySelector('.spa-process-grid'), section.items, (item, index) => {
          const article = document.createElement('article');
          const number = document.createElement('span');
          number.textContent = String(index + 1).padStart(2, '0');
          const title = document.createElement('h3');
          title.textContent = item.title;
          const body = document.createElement('p');
          body.textContent = item.body;
          article.append(number, title, body);
          return article;
        });
      } else if (section.id === 'contact') {
        setText(root.querySelector('.spa-kicker'), section.label);
        setLines(root.querySelector('h2'), section.title);
        setText(root.querySelector('.contact-placeholder'), section.description);
        setText(root.querySelector('.spa-contact-action'), section.cta);
        const link = root.querySelector('[data-contact-link]');
        const placeholder = root.querySelector('.contact-placeholder-link');
        const href = safeContactUrl(section.contactUrl);
        if (link) {
          link.href = href || '#';
          link.hidden = !href;
          if (placeholder) placeholder.hidden = Boolean(href);
          setText(link.querySelector('[data-contact-label]'), section.cta);
        }
      }
    } else if (industry === 'karaoke') {
      if (section.id === 'experience') {
        setText(root.querySelector('.karaoke-index'), section.label);
        setLines(root.querySelector('.karaoke-section-intro h2'), section.title);
        setText(root.querySelector('.karaoke-section-intro>p'), section.intro);
        const room = section.items?.[0];
        const details = section.items?.[1];
        if (room) setText(root.querySelector('.room-window>span'), room.title);
        if (room) setText(root.querySelector('.room-window>b'), room.detail);
        if (details) setText(root.querySelector('.room-specimen-copy>span'), details.title);
        setList(root.querySelector('.room-specimen-copy ul'), details?.features, value => {
          const li = document.createElement('li');
          li.textContent = value;
          return li;
        });
      } else if (section.id === 'solutions') {
        setText(root.querySelector('.karaoke-index'), section.label);
        setLines(root.querySelector('h2'), section.title, 2);
        setList(root.querySelector('.karaoke-flow-items'), section.items, (item, index) => {
          const article = document.createElement('article');
          const number = document.createElement('b');
          number.textContent = String(index + 1).padStart(2, '0');
          const title = document.createElement('h3');
          title.textContent = item.title;
          const body = document.createElement('p');
          body.textContent = item.body;
          article.append(number, title, body);
          return article;
        });
        setText(root.querySelector('.karaoke-outline'), section.cta);
      } else if (section.id === 'work') {
        setText(root.querySelector('.karaoke-index'), section.label);
        setLines(root.querySelector('.karaoke-work-heading h2'), section.title, 1);
        setText(root.querySelector('.karaoke-work-heading>p:last-child'), section.intro);
      } else if (section.id === 'process') {
        setText(root.querySelector('.karaoke-index'), section.label);
        setLines(root.querySelector('h2'), section.title, 1);
        setList(root.querySelector('.karaoke-process-grid'), section.items, (item, index) => {
          const article = document.createElement('article');
          const number = document.createElement('span');
          number.textContent = String(index + 1).padStart(2, '0');
          const title = document.createElement('h3');
          title.textContent = item.title;
          const body = document.createElement('p');
          body.textContent = item.body;
          article.append(number, title, body);
          return article;
        });
      } else if (section.id === 'contact') {
        setText(root.querySelector('.karaoke-kicker'), section.label);
        setLines(root.querySelector('h2'), section.title);
        setText(root.querySelector('.contact-placeholder'), section.description);
        setText(root.querySelector('.karaoke-contact-action'), section.cta);
        const link = root.querySelector('[data-contact-link]');
        const placeholder = root.querySelector('.contact-placeholder-link');
        const href = safeContactUrl(section.contactUrl);
        if (link) {
          link.href = href || '#';
          link.hidden = !href;
          if (placeholder) placeholder.hidden = Boolean(href);
          setText(link.querySelector('[data-contact-label]'), section.cta);
        }
      }
    }
  };
  const safeContactUrl = value => {
    if (typeof value !== 'string' || !value) return '';
    try {
      const url = new URL(value);
      return ['https:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };
  const renderProjects = (section, projects) => {
    const list = section.querySelector('.project-list');
    const status = section.querySelector('.project-status');
    if (!list || !status) throw new Error('Portfolio project section is incomplete.');
    const published = projects.filter(project => project.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (!published.length) {
      status.hidden = false;
      return;
    }
    list.replaceChildren(...published.map(project => {
      if (!project?.name || !project.problem || !project.solution) {
        throw new Error('A project is missing its name, problem, or solution.');
      }
      const article = document.createElement('article');
      article.className = 'project-card';
      const imageUrl = assetUrl(project.thumbnail?.path);
      if (imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = project.thumbnail.alt || `Hình ảnh dự án ${project.name}`;
        image.loading = 'lazy';
        article.append(image);
      }
      const eyebrow = document.createElement('p');
      eyebrow.className = 'project-eyebrow';
      eyebrow.textContent = project.businessType || project.industry || 'Dự án thực tế';
      const title = document.createElement('h3');
      title.textContent = project.name;
      const description = document.createElement('p');
      description.textContent = project.description || '';
      const problem = document.createElement('p');
      problem.textContent = project.problem;
      const solution = document.createElement('p');
      solution.textContent = project.solution;
      article.append(eyebrow, title, description, problem, solution);
      if (Array.isArray(project.features) && project.features.length) {
        const features = document.createElement('ul');
        features.className = 'project-conversion';
        project.features.forEach(feature => {
          const li = document.createElement('li');
          li.textContent = feature;
          features.append(li);
        });
        article.append(features);
      }
      if (Array.isArray(project.gallery)) {
        project.gallery.forEach(item => {
          const galleryUrl = assetUrl(item.path);
          if (!galleryUrl) return;
          const image = document.createElement('img');
          image.src = galleryUrl;
          image.alt = item.alt || `Hình ảnh dự án ${project.name}`;
          image.loading = 'lazy';
          article.append(image);
        });
      }
      if (project.result) {
        const result = document.createElement('p');
        result.className = 'project-result';
        result.textContent = project.result;
        article.append(result);
      }
      if (project.url) {
        const link = document.createElement('a');
        const href = safeContactUrl(project.url);
        if (href) {
          link.href = href;
          link.textContent = 'Xem website ↗';
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          article.append(link);
        }
      }
      return article;
    }));
    status.hidden = true;
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
    toggle.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    if (restoreFocus) toggle.focus();
  };
  const openMenu = focus => {
    toggle.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    if (focus) items[focus === 'last' ? items.length - 1 : 0]?.focus();
  };

  toggle.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') closeMenu();
    else openMenu();
  });

  toggle.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu(event.key === 'ArrowUp' ? 'last' : 'first');
    }
  });

  menu.addEventListener('keydown', event => {
    const index = items.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      items[(index + direction + items.length) % items.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items.at(-1)?.focus();
    }
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.industry-picker')) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu({ restoreFocus: true });
    }
  });

  const industry = document.body.dataset.industry;
  const publicError = document.querySelector('#portfolio-data-error');
  if (industry) {
    try {
      const [content, projectData] = await Promise.all([
        readData('../data/content.json'),
        readData('../data/projects.json')
      ]);
      const page = content.industries?.[industry];
      const projects = projectData[industry];
      if (!page?.hero || !Array.isArray(page.sections) || !Array.isArray(projects)) {
        throw new Error(`Portfolio data for "${industry}" is incomplete.`);
      }
      setHero(industry, page.hero);
      page.sections.forEach(section => renderSection(industry, section));
      reorderSections(page);
      const projectSection = main.querySelector('[data-portfolio-section="work"]');
      if (projectSection) renderProjects(projectSection, projects);
    } catch (error) {
      console.error(`Không tải được dữ liệu Portfolio "${industry}":`, error);
      if (publicError) {
        publicError.hidden = false;
        publicError.textContent = `Không tải được dữ liệu Portfolio. Hãy kiểm tra content.json và projects.json. (${error.message})`;
      }
    }
  }

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'portfolio-manager-preview') return;
    try {
      const { industry: previewIndustry, content, projects } = event.data;
      if (previewIndustry !== document.body.dataset.industry) return;
      previewAssetUrls = event.data.imageUrls || {};
      setHero(previewIndustry, content.hero);
      content.sections.forEach(section => renderSection(previewIndustry, section));
      reorderSections(content);
      if (Array.isArray(projects)) {
        const projectSection = document.querySelector('[data-portfolio-section="work"]');
        if (projectSection) renderProjects(projectSection, projects);
      }
    } catch (error) {
      console.error('Không thể xem trước bản nháp Portfolio:', error);
    }
  });
})();
