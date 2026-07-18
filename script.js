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
const lightboxImage = lightbox?.querySelector('img');
const lightboxText = lightbox?.querySelector('p');

function openLightbox(source, title) {
  if (!lightbox || !lightboxImage || !lightboxText) return;
  lightboxImage.src = source;
  lightboxText.textContent = title || '';
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  if (!lightbox || !lightboxImage) return;
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImage.src = '';
}

document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});

let allProjects = [];
let activeProject = null;
let activeProjectImageIndex = 0;

const projectModal = document.getElementById('project-modal');
const projectModalImage = document.getElementById('project-modal-image');
const projectModalTitle = document.getElementById('project-modal-title');
const projectModalCategory = document.getElementById('project-modal-category');
const projectModalDescription = document.getElementById('project-modal-description');
const projectModalServices = document.getElementById('project-modal-services');
const projectModalThumbnails = document.getElementById('project-modal-thumbnails');
const projectModalQuote = document.getElementById('project-modal-quote');
const projectModalCounter = document.getElementById('project-modal-counter');
const relatedProjects = document.getElementById('related-projects');
const relatedProjectsGrid = document.getElementById('related-projects-grid');
function projectImages(project) {
  return [project.image, ...(Array.isArray(project.gallery) ? project.gallery : [])]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
}

function updateProjectModalImage(index) {
  if (!activeProject || !projectModalImage) return;
  const images = projectImages(activeProject);
  if (!images.length) return;

  activeProjectImageIndex = (index + images.length) % images.length;
  projectModalImage.src = images[activeProjectImageIndex];if (projectModalCounter) {
  projectModalCounter.textContent =
    `${activeProjectImageIndex + 1} / ${images.length}`;
}
  projectModalImage.alt = activeProject.title || 'Portfolio project';

  projectModalThumbnails.innerHTML = images.map((image, imageIndex) => `
    <button type="button" class="${imageIndex === activeProjectImageIndex ? 'active' : ''}" data-project-image="${imageIndex}">
      <img src="${escapeHtml(image)}" alt="">
    </button>
  `).join('');

  projectModalThumbnails.querySelectorAll('[data-project-image]').forEach((button) => {
    button.addEventListener('click', () => updateProjectModalImage(Number(button.dataset.projectImage)));
  });

  const arrowsVisible = images.length > 1;
  projectModal.querySelectorAll('.project-modal-arrow').forEach((arrow) => {
    arrow.hidden = !arrowsVisible;
  });
}
function renderRelatedProjects(project) {
  if (!relatedProjects || !relatedProjectsGrid || !project) return;

  const related = allProjects
    .filter((item) =>
      item.visible !== false &&
      item !== project &&
      item.category === project.category
    )
    .sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (Number(a.order) || 999) - (Number(b.order) || 999);
    })
    .slice(0, 3);

  if (!related.length) {
    relatedProjects.hidden = true;
    relatedProjectsGrid.innerHTML = '';
    return;
  }

  relatedProjects.hidden = false;

  relatedProjectsGrid.innerHTML = related.map((item) => `
    <button
      type="button"
      class="related-project-card"
      data-related-project="${allProjects.indexOf(item)}"
      aria-label="View ${escapeHtml(item.title)}"
    >
      <img
        src="${escapeHtml(item.image)}"
        alt="${escapeHtml(item.title)}"
        loading="lazy"
        decoding="async"
      >

      <span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.category)}</small>
      </span>
    </button>
  `).join('');

  relatedProjectsGrid
    .querySelectorAll('[data-related-project]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const relatedProject =
          allProjects[Number(button.dataset.relatedProject)];

        openProjectModal(relatedProject, button);
      });
    });
}
function openProjectModal(project) {
  if (!projectModal || !project) return;
  activeProject = project;
  activeProjectImageIndex = 0;

  projectModalTitle.textContent = project.title || 'Custom Project';
  projectModalCategory.textContent = project.category || 'Project';
  projectModalDescription.textContent = project.description || '';

  const services = Array.isArray(project.services) ? project.services.filter(Boolean) : [];
  projectModalServices.innerHTML = services.map((service) => `<span>${escapeHtml(service)}</span>`).join('');

  const quoteText = `I'm interested in something similar to: ${project.title || 'this project'}`;
  projectModalQuote.href = `#quote`;
  projectModalQuote.dataset.projectInterest = quoteText;

  updateProjectModalImage(0);
  renderRelatedProjects(project);
  projectModal.classList.add('open');
  projectModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeProjectModal() {
  if (!projectModal) return;
  projectModal.classList.remove('open');
  projectModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  activeProject = null;
}

document.querySelectorAll('[data-close-project]').forEach((button) => {
  button.addEventListener('click', closeProjectModal);
});

projectModal?.querySelector('.project-modal-arrow.previous')?.addEventListener('click', () => {
  updateProjectModalImage(activeProjectImageIndex - 1);
});

projectModal?.querySelector('.project-modal-arrow.next')?.addEventListener('click', () => {
  updateProjectModalImage(activeProjectImageIndex + 1);
});
let touchStartX = 0;

projectModal?.addEventListener('touchstart', (event) => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });

projectModal?.addEventListener('touchend', (event) => {
  if (!activeProject) return;

  const touchEndX = event.changedTouches[0].clientX;
  const distance = touchEndX - touchStartX;

  if (Math.abs(distance) < 50) return;

  if (distance < 0) {
    updateProjectModalImage(activeProjectImageIndex + 1);
  } else {
    updateProjectModalImage(activeProjectImageIndex - 1);
  }
}, { passive: true });
projectModalQuote?.addEventListener('click', () => {
  const details = document.getElementById('quote-details');
  if (details && projectModalQuote.dataset.projectInterest) {
    details.value = projectModalQuote.dataset.projectInterest;
  }
  closeProjectModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeLightbox();
    closeProjectModal();
  }
  if (projectModal?.classList.contains('open') && event.key === 'ArrowLeft') {
    updateProjectModalImage(activeProjectImageIndex - 1);
  }
  if (projectModal?.classList.contains('open') && event.key === 'ArrowRight') {
    updateProjectModalImage(activeProjectImageIndex + 1);
  }
});

function renderProjects(filter = 'all') {
  const gallery = document.getElementById('dynamic-gallery');
  if (!gallery) return;

  const publishedProjects = allProjects
    .filter((project) => project.visible !== false)
    .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));

  const visibleProjects = filter === 'all'
    ? publishedProjects
    : publishedProjects.filter((project) => project.category === filter);

  if (!visibleProjects.length) {
    gallery.innerHTML = '<p class="gallery-loading">No projects in this category yet.</p>';
    return;
  }

  gallery.innerHTML = visibleProjects.map((project, index) => `
    <button class="gallery-item visible ${project.featured ? 'featured' : ''}" data-project-index="${allProjects.indexOf(project)}">
      <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}" loading="lazy">
      <span class="gallery-caption">
        <strong>${escapeHtml(project.title)}</strong>
        <small>${escapeHtml(project.category)}</small>
      </span>
      ${project.featured ? '<span class="featured-badge">Featured</span>' : ''}
    </button>
  `).join('');

  gallery.querySelectorAll('[data-project-index]').forEach((item) => {
    item.addEventListener('click', () => {
      const project = allProjects[Number(item.dataset.projectIndex)];
      openProjectModal(project);
    });
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
    if (gallery) gallery.innerHTML = '<p class="gallery-loading">The gallery could not be loaded. Please refresh the page.</p>';
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

function setText(id, value) {
  const element = document.getElementById(id);
  if (element && typeof value === 'string') element.textContent = value;
}

async function loadHomepageContent() {
  try {
    const response = await fetch(`/data/homepage.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load homepage content');
    const data = await response.json();

    setText('hero-eyebrow', data.hero?.eyebrow);
    setText('hero-title-line-1', data.hero?.title_line_1);
    setText('hero-title-line-2', data.hero?.title_line_2);
    setText('hero-description', data.hero?.description);

    const primary = document.getElementById('hero-primary');
    if (primary) {
      primary.textContent = data.hero?.primary_button_text || primary.textContent;
      primary.href = data.hero?.primary_button_link || primary.href;
    }

    const secondary = document.getElementById('hero-secondary');
    if (secondary) {
      secondary.textContent = data.hero?.secondary_button_text || secondary.textContent;
      secondary.href = data.hero?.secondary_button_link || secondary.href;
    }

    const video = document.getElementById('hero-video');
    const videoSource = document.getElementById('hero-video-source');
    if (video && videoSource && data.hero?.video) {
      video.poster = data.hero?.poster || video.poster;
      if (videoSource.getAttribute('src') !== data.hero.video) {
        videoSource.src = data.hero.video;
        video.load();
        video.play().catch(() => {});
      }
    }

    setText('about-eyebrow', data.about?.eyebrow);
    setText('about-title', data.about?.title);
    setText('about-p1', data.about?.paragraph_1);
    setText('about-p2', data.about?.paragraph_2);
    setText('about-p3', data.about?.paragraph_3);

    setText('contact-eyebrow', data.contact?.eyebrow);
    setText('contact-title', data.contact?.title);
    setText('contact-description', data.contact?.description);

    const phone = data.contact?.phone || '860-336-9202';
    const textButton = document.getElementById('contact-text');
    if (textButton) {
      textButton.textContent = `Text ${phone}`;
      textButton.href = `sms:+1${phone.replace(/\D/g, '')}`;
    }

    const whatsapp = document.getElementById('contact-whatsapp');
    if (whatsapp && data.contact?.whatsapp) {
      whatsapp.href = `https://wa.me/${data.contact.whatsapp.replace(/\D/g, '')}`;
    }

    const email = document.getElementById('contact-email');
    if (email && data.contact?.email) {
      email.textContent = data.contact.email;
      email.href = `mailto:${data.contact.email}`;
    }

    setText('contact-note', `${data.contact?.location || 'Connecticut'} • ${data.contact?.note || 'No minimum orders'}`);
  } catch (error) {
    console.error(error);
  }
}

async function loadTestimonials() {
  const grid = document.getElementById('testimonial-grid');
  if (!grid) return;

  try {
    const response = await fetch(`/data/testimonials.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load testimonials');
    const data = await response.json();
    const items = (data.testimonials || []).filter((item) => item.visible);

    if (!items.length) {
      grid.innerHTML = '<p class="gallery-loading">Testimonials will appear here when you publish them from the panel.</p>';
      return;
    }

    grid.innerHTML = items.map((item) => `
      <article class="testimonial-card reveal visible">
        <p>“${escapeHtml(item.quote)}”</p>
        <div>
          <strong>${item.name}</strong>
          <span>${item.company || ''}</span>
        </div>
      </article>
    `).join('');
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="gallery-loading">Testimonials are temporarily unavailable.</p>';
  }
}

loadHomepageContent();
loadTestimonials();

let siteSettings = null;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderFaqs(faqs = []) {
  const list = document.getElementById('faq-list');
  if (!list) return;

  if (!faqs.length) {
    list.innerHTML = '<p class="gallery-loading">No frequently asked questions have been published yet.</p>';
    return;
  }

  list.innerHTML = faqs.map((item, index) => `
    <article class="faq-item">
      <button type="button" aria-expanded="${index === 0 ? 'true' : 'false'}">
        <span>${escapeHtml(item.question)}</span>
        <b>+</b>
      </button>
      <div class="faq-answer ${index === 0 ? 'open' : ''}">
        <p>${escapeHtml(item.answer)}</p>
      </div>
    </article>
  `).join('');

  list.querySelectorAll('.faq-item button').forEach((button) => {
    button.addEventListener('click', () => {
      const answer = button.nextElementSibling;
      const open = !answer.classList.contains('open');
      answer.classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
    });
  });
}

function renderSocials(socials = {}) {
  const container = document.getElementById('social-links');
  if (!container) return;

  const links = [
    ['Facebook', socials.facebook],
    ['Instagram', socials.instagram],
    ['TikTok', socials.tiktok]
  ].filter(([, url]) => url);

  container.innerHTML = links.map(([label, url]) => `
    <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${label}</a>
  `).join('');
}

function prepareQuoteForm(settings = {}) {
  const select = document.getElementById('quote-type');
  if (!select) return;

  const types = Array.isArray(settings.project_types) ? settings.project_types : [];
  select.innerHTML = '<option value="">Select a project</option>' +
    types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('');

  setText('quote-heading', settings.heading);
  setText('quote-description', settings.description);
  setText('quote-note', settings.success_note);
}

async function loadSiteSettings() {
  try {
    const response = await fetch(`/data/site.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load site settings');
    siteSettings = await response.json();
    renderFaqs(siteSettings.faqs || []);
    renderSocials(siteSettings.socials || {});
    prepareQuoteForm(siteSettings.quote_form || {});
  } catch (error) {
    console.error(error);
  }
}

document.getElementById('quote-form')?.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('quote-name').value.trim();
  const phone = document.getElementById('quote-phone').value.trim();
  const email = document.getElementById('quote-email').value.trim();
  const type = document.getElementById('quote-type').value;
  const quantity = document.getElementById('quote-quantity').value.trim();
  const deadline = document.getElementById('quote-deadline').value;
  const details = document.getElementById('quote-details').value.trim();

  if (!name || !phone || !type || !details) {
    alert('Please complete the required fields.');
    return;
  }

  const message = [
    'Hello Imaginable Things! I would like to request a quote.',
    '',
    `Name: ${name}`,
    `Phone: ${phone}`,
    email ? `Email: ${email}` : '',
    `Project: ${type}`,
    quantity ? `Estimated quantity: ${quantity}` : '',
    deadline ? `Needed by: ${deadline}` : '',
    '',
    'Project details:',
    details
  ].filter(Boolean).join('\n');

  const number = siteSettings?.quote_form?.whatsapp_number || '18603369202';
  const url = `https://wa.me/${String(number).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
});

loadSiteSettings();

