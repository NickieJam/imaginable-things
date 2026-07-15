const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');

toggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.main-nav a').forEach((link) => {
  link.addEventListener('click', () => nav.classList.remove('open'));
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const lightbox = document.querySelector('.lightbox');
const lightboxImage = lightbox.querySelector('img');
const lightboxText = lightbox.querySelector('p');

function openLightbox(source, title) {
  lightboxImage.src = source;
  lightboxText.textContent = title || '';
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImage.src = '';
}

document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeLightbox();
});

let allProjects = [];

function renderProjects(filter = 'all') {
  const gallery = document.getElementById('dynamic-gallery');
  const visibleProjects = filter === 'all'
    ? allProjects
    : allProjects.filter((project) => project.category === filter);

  if (!visibleProjects.length) {
    gallery.innerHTML = '<p class="gallery-loading">No projects in this category yet.</p>';
    return;
  }

  gallery.innerHTML = visibleProjects.map((project) => `
    <button class="gallery-item visible" data-category="${project.category}" data-src="${project.image}" data-title="${project.title}">
      <img src="${project.image}" alt="${project.title}" loading="lazy">
      <span class="gallery-caption">
        <strong>${project.title}</strong>
        <small>${project.category}</small>
      </span>
    </button>
  `).join('');

  gallery.querySelectorAll('[data-src]').forEach((item) => {
    item.addEventListener('click', () => openLightbox(item.dataset.src, item.dataset.title));
  });
}

async function loadProjects() {
  const gallery = document.getElementById('dynamic-gallery');

  try {
    const response = await fetch(`/data/projects.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load projects');
    const data = await response.json();
    allProjects = Array.isArray(data.projects) ? data.projects : [];
    renderProjects();
  } catch (error) {
    console.error(error);
    gallery.innerHTML = '<p class="gallery-loading">The gallery could not be loaded. Please refresh the page.</p>';
  }
}

document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    renderProjects(button.dataset.filter);
  });
});

document.querySelectorAll('.project[data-src]').forEach((item) => {
  item.addEventListener('click', () => openLightbox(item.dataset.src, item.dataset.title));
});

document.getElementById('year').textContent = new Date().getFullYear();
loadProjects();
