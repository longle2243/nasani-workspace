(() => {
  'use strict';

  const toggle = document.querySelector('.industry-toggle');
  const menu = document.querySelector('#industry-menu');
  if (!toggle || !menu) {
    throw new Error('Portfolio industry navigation is missing its toggle or menu.');
  }

  const items = [...menu.querySelectorAll('a')];
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

  document.querySelectorAll('[data-projects]').forEach(async section => {
    const industry = section.dataset.projects;
    const list = section.querySelector('.project-list');
    const status = section.querySelector('.project-status');
    if (!list || !status) throw new Error(`Portfolio project section "${industry}" is incomplete.`);

    try {
      const response = await fetch('../data/projects.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const projects = data[industry];
      if (!Array.isArray(projects)) throw new Error(`Missing project list for "${industry}".`);
      if (projects.length) {
        list.replaceChildren(...projects.map(project => {
          if (!project?.name || !project.problem || !project.solution) {
            throw new Error(`A project for "${industry}" is missing its name, problem, or solution.`);
          }
          const article = document.createElement('article');
          article.className = 'project-card';
          const eyebrow = document.createElement('p');
          eyebrow.className = 'project-eyebrow';
          eyebrow.textContent = project.industry || 'Dự án thực tế';
          const title = document.createElement('h3');
          title.textContent = project.name;
          const problem = document.createElement('p');
          problem.textContent = project.problem;
          const solution = document.createElement('p');
          solution.textContent = project.solution;
          article.append(eyebrow, title, problem, solution);
          if (Array.isArray(project.conversionPoints) && project.conversionPoints.length) {
            const points = document.createElement('ul');
            points.className = 'project-conversion';
            project.conversionPoints.forEach(point => {
              const item = document.createElement('li');
              item.textContent = point;
              points.append(item);
            });
            article.append(points);
          }
          if (project.image) {
            const image = document.createElement('img');
            image.src = project.image;
            image.alt = project.imageAlt || `Hình ảnh dự án ${project.name}`;
            image.loading = 'lazy';
            article.prepend(image);
          }
          if (project.result) {
            const result = document.createElement('p');
            result.className = 'project-result';
            result.textContent = project.result;
            article.append(result);
          }
          return article;
        }));
        status.hidden = true;
      } else {
        status.hidden = false;
      }
    } catch (error) {
      console.error(`Không tải được dữ liệu Portfolio "${industry}":`, error);
      status.textContent = 'Không thể tải dữ liệu dự án. Hãy kiểm tra portfolio/data/projects.json.';
      status.dataset.state = 'error';
      status.hidden = false;
    }
  });
})();
