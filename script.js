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

async function loadServices() {
  const servicesGrid = document.getElementById('services-grid');

  if (!servicesGrid) {
    return;
  }

  try {
    const response = await fetch(
      `/data/services.json?v=${Date.now()}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`Unable to load services: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.services)) {
      throw new Error('services.json does not contain a services array');
    }

    const visibleServices = data.services
      .filter((service) => service && service.visible !== false)
      .sort((firstService, secondService) => {
        const firstOrder = Number(firstService.order) || 0;
        const secondOrder = Number(secondService.order) || 0;

        return firstOrder - secondOrder;
      });

    if (visibleServices.length === 0) {
      console.warn('No visible services were found. Keeping HTML fallback.');
      return;
    }

    const fragment = document.createDocumentFragment();

    visibleServices.forEach((service, index) => {
      const card = document.createElement('article');
      card.className = 'service-card visible';

      const number = document.createElement('em');
      number.textContent = String(index + 1).padStart(2, '0');

      const title = document.createElement('h3');
      title.textContent = service.name || 'Custom Service';

      const description = document.createElement('p');
      description.textContent =
        service.short_description ||
        service.description ||
        'Custom service created for your project.';

      card.append(number, title, description);
      fragment.appendChild(card);
    });

    servicesGrid.replaceChildren(fragment);

    servicesGrid.querySelectorAll('.service-card').forEach((card) => {
      card.classList.add('visible');
    });
  } catch (error) {
    console.error('Services could not be loaded:', error);
  }
}

async function loadProjects() {
  const gallery = document.getElementById('dynamic-gallery');

  try {
    const response = await fetch(
      `/data/projects.json?v=${Date.now()}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('Unable to load projects');
    }

    const data = await response.json();
    allProjects = Array.isArray(data.projects) ? data.projects : [];
    renderProjects();
  } catch (error) {
    console.error(error);

    if (gallery) {
      gallery.innerHTML =
        '<p class="gallery-loading">The gallery could not be loaded. Please refresh the page.</p>';
    }
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
})/* ==================================================
   SMART QUOTE WIZARD
================================================== */

const smartQuoteModal = document.getElementById('smart-quote-modal');
const smartQuoteContent = document.getElementById('smart-quote-content');
const smartQuoteStepLabel = document.getElementById('smart-quote-step-label');
const smartQuoteProgressBar = document.getElementById('smart-quote-progress-bar');
const smartQuoteBack = document.getElementById('smart-quote-back');
const smartQuoteNext = document.getElementById('smart-quote-next');
const smartQuoteClose = document.getElementById('smart-quote-close');
const smartQuoteError = document.getElementById('smart-quote-error');

const smartQuoteState = {
  step: 0,
  product: '',
  method: '',
  quantity: '',
  placement: '',
  deadline: '',
  details: '',
  name: '',
  phone: '',
  email: '',
  file: null,
  filePreviewUrl: ''
};

const smartQuoteSteps = [
  {
    title: 'What would you like to customize?',
    description: 'Select the product that best matches your project.',
    field: 'product',
    options: [
      ['👕', 'T-Shirt'],
      ['🧥', 'Hoodie'],
      ['🧢', 'Hat'],
      ['👔', 'Polo'],
      ['☕', 'Tumbler'],
      ['📢', 'Banner'],
      ['🎒', 'Bag'],
      ['✨', 'Other']
    ]
  },
  {
    title: 'How would you like it personalized?',
    description: 'Choose the decoration method you are interested in.',
    field: 'method',
    options: [
      ['🧵', 'Embroidery'],
      ['🪡', '3D Puff Embroidery'],
      ['🎨', 'Sublimation'],
      ['👕', 'DTF'],
      ['✂️', 'Vinyl'],
      ['🖨️', 'Screen Printing'],
      ['❓', 'Not Sure']
    ]
  },
  {
    title: 'How many do you need?',
    description: 'Choose the estimated quantity.',
    field: 'quantity',
    options: [
      ['1', '1–5'],
      ['6', '6–12'],
      ['13', '13–24'],
      ['25', '25–50'],
      ['51', '51–100'],
      ['+', '100+']
    ]
  },
  {
    title: 'Where should the design be placed?',
    description: 'Select the main location for your design.',
    field: 'placement',
    options: [
      ['↖', 'Left Chest'],
      ['↗', 'Right Chest'],
      ['⬆', 'Center Chest'],
      ['🔙', 'Full Back'],
      ['◀', 'Left Sleeve'],
      ['▶', 'Right Sleeve'],
      ['🧢', 'Front of Hat'],
      ['✨', 'Other']
    ]
  }
];

function openSmartQuote() {
  if (!smartQuoteModal) return;

  smartQuoteModal.classList.add('is-open');
  smartQuoteModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('smart-quote-open');

  renderSmartQuoteStep();

  window.setTimeout(() => {
    smartQuoteClose?.focus();
  }, 50);
}

function closeSmartQuote() {
  if (!smartQuoteModal) return;

  smartQuoteModal.classList.remove('is-open');
  smartQuoteModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('smart-quote-open');
}

function selectSmartQuoteOption(field, value, button) {
  smartQuoteState[field] = value;

  document
    .querySelectorAll('.smart-quote-option')
    .forEach((option) => option.classList.remove('is-selected'));

  button.classList.add('is-selected');
  smartQuoteError.textContent = '';
}

function renderOptionStep(stepData) {
  const options = stepData.options
    .map(([icon, label]) => {
      const selected =
        smartQuoteState[stepData.field] === label ? 'is-selected' : '';

      return `
        <button
          class="smart-quote-option ${selected}"
          type="button"
          data-smart-field="${stepData.field}"
          data-smart-value="${label}"
        >
          <span class="smart-quote-option-icon">${icon}</span>
          <span>${label}</span>
        </button>
      `;
    })
    .join('');

  smartQuoteContent.innerHTML = `
    <div class="smart-quote-question">
      <h3>${stepData.title}</h3>
      <p>${stepData.description}</p>
    </div>

    <div class="smart-quote-options">
      ${options}
    </div>
  `;

  smartQuoteContent
    .querySelectorAll('.smart-quote-option')
    .forEach((button) => {
      button.addEventListener('click', () => {
        selectSmartQuoteOption(
          button.dataset.smartField,
          button.dataset.smartValue,
          button
        );
      });
    });
}

function renderProjectDetailsStep() {
  smartQuoteContent.innerHTML = `
    <div class="smart-quote-question">
      <h3>Tell us more about your project</h3>
      <p>Add your preferred deadline and any important details.</p>
    </div>

    <div class="smart-quote-fields">
      <label class="smart-quote-field">
        <span>Needed by</span>
        <input
          type="date"
          id="smart-deadline"
          value="${smartQuoteState.deadline}"
        >
      </label>

      <label class="smart-quote-field full">
        <span>Project details *</span>
        <textarea
          id="smart-details"
          placeholder="Colors, sizes, design size, thread colors and anything else we should know."
        >${smartQuoteState.details}</textarea>
      </label>
    </div>
  `;
}


const SMART_QUOTE_ACCEPTED_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'webp', 'pdf', 'svg', 'ai', 'eps',
  'dst', 'emb', 'pes', 'exp', 'jef', 'vp3', 'hus', 'xxx'
];
const SMART_QUOTE_MAX_FILE_SIZE = 10 * 1024 * 1024;

function getSmartQuoteFileExtension(fileName) {
  return String(fileName || '').split('.').pop().toLowerCase();
}

function formatSmartQuoteFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 1
    ? `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getSmartQuoteFileMessage(extension) {
  if (extension === 'dst') return 'Ready-to-stitch embroidery file received.';
  if (extension === 'emb') return 'Hatch Embroidery project received.';
  if (['pes', 'exp', 'jef', 'vp3', 'hus', 'xxx'].includes(extension)) {
    return 'Embroidery machine file received for review.';
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(extension)) {
    return 'Artwork received. This design may require embroidery digitizing.';
  }
  return 'Artwork received for review.';
}

function clearSmartQuoteFile() {
  if (smartQuoteState.filePreviewUrl) {
    URL.revokeObjectURL(smartQuoteState.filePreviewUrl);
  }
  smartQuoteState.file = null;
  smartQuoteState.filePreviewUrl = '';
  renderUploadStep();
}

function setSmartQuoteFile(file) {
  smartQuoteError.textContent = '';
  if (!file) return;

  const extension = getSmartQuoteFileExtension(file.name);
  if (!SMART_QUOTE_ACCEPTED_EXTENSIONS.includes(extension)) {
    smartQuoteError.textContent =
      'That file type is not accepted. Please upload artwork or an embroidery file.';
    return;
  }

  if (file.size > SMART_QUOTE_MAX_FILE_SIZE) {
    smartQuoteError.textContent = 'The file is larger than 10 MB.';
    return;
  }

  if (smartQuoteState.filePreviewUrl) {
    URL.revokeObjectURL(smartQuoteState.filePreviewUrl);
  }

  smartQuoteState.file = file;
  smartQuoteState.filePreviewUrl = ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(extension)
    ? URL.createObjectURL(file)
    : '';

  renderUploadStep();
}

function renderUploadStep() {
  const file = smartQuoteState.file;
  const extension = file ? getSmartQuoteFileExtension(file.name) : '';
  const preview = file && smartQuoteState.filePreviewUrl
    ? `<img class="smart-quote-file-preview" src="${smartQuoteState.filePreviewUrl}" alt="Preview of ${escapeSmartQuoteText(file.name)}">`
    : file
      ? `<div class="smart-quote-file-icon" aria-hidden="true">${extension === 'pdf' ? 'PDF' : extension.toUpperCase()}</div>`
      : '';

  smartQuoteContent.innerHTML = `
    <div class="smart-quote-question">
      <h3>Upload your design or embroidery file</h3>
      <p>This step is optional. You can also attach the file later in WhatsApp.</p>
    </div>

    ${file ? `
      <div class="smart-quote-file-card">
        ${preview}
        <div class="smart-quote-file-info">
          <strong>${escapeSmartQuoteText(file.name)}</strong>
          <span>${extension.toUpperCase()} · ${formatSmartQuoteFileSize(file.size)}</span>
          <p>${getSmartQuoteFileMessage(extension)}</p>
        </div>
        <div class="smart-quote-file-actions">
          <label class="button smart-quote-file-replace">
            Replace
            <input id="smart-file-replace" type="file" hidden>
          </label>
          <button class="button smart-quote-file-remove" id="smart-file-remove" type="button">Remove</button>
        </div>
      </div>
    ` : `
      <label class="smart-quote-dropzone" id="smart-quote-dropzone">
        <input id="smart-file-input" type="file" hidden>
        <span class="smart-quote-upload-icon" aria-hidden="true">↑</span>
        <strong>Drag and drop your file here</strong>
        <span>or click to browse</span>
        <small>Maximum 10 MB</small>
      </label>
    `}

    <p class="smart-quote-file-formats">
      Accepted: PNG, JPG, JPEG, WEBP, PDF, SVG, AI, EPS, DST, EMB, PES, EXP, JEF, VP3, HUS and XXX.
    </p>
  `;

  const configureInput = (input) => {
    if (!input) return;
    input.setAttribute('accept', SMART_QUOTE_ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(','));
    input.addEventListener('change', () => setSmartQuoteFile(input.files?.[0]));
  };

  configureInput(document.getElementById('smart-file-input'));
  configureInput(document.getElementById('smart-file-replace'));
  document.getElementById('smart-file-remove')?.addEventListener('click', clearSmartQuoteFile);

  const dropzone = document.getElementById('smart-quote-dropzone');
  if (dropzone) {
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add('is-dragging');
      });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove('is-dragging');
      });
    });
    dropzone.addEventListener('drop', (event) => {
      setSmartQuoteFile(event.dataTransfer?.files?.[0]);
    });
  }
}

function renderContactStep() {
  smartQuoteContent.innerHTML = `
    <div class="smart-quote-question">
      <h3>How can we contact you?</h3>
      <p>Enter the information we should use for your quote.</p>
    </div>

    <div class="smart-quote-fields">
      <label class="smart-quote-field">
        <span>Your name *</span>
        <input
          type="text"
          id="smart-name"
          autocomplete="name"
          value="${smartQuoteState.name}"
        >
      </label>

      <label class="smart-quote-field">
        <span>Phone number *</span>
        <input
          type="tel"
          id="smart-phone"
          autocomplete="tel"
          value="${smartQuoteState.phone}"
        >
      </label>

      <label class="smart-quote-field full">
        <span>Email</span>
        <input
          type="email"
          id="smart-email"
          autocomplete="email"
          value="${smartQuoteState.email}"
        >
      </label>
    </div>
  `;
}

function escapeSmartQuoteText(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderReviewStep() {
  const reviewItems = [
    ['Product', smartQuoteState.product],
    ['Method', smartQuoteState.method],
    ['Quantity', smartQuoteState.quantity],
    ['Placement', smartQuoteState.placement],
    ['Needed by', smartQuoteState.deadline || 'Not specified'],
    ['Name', smartQuoteState.name],
    ['Phone', smartQuoteState.phone],
    ['Email', smartQuoteState.email || 'Not provided'],
    ['Design file', smartQuoteState.file
      ? `${smartQuoteState.file.name} (${formatSmartQuoteFileSize(smartQuoteState.file.size)})`
      : 'Not provided'],
    ['Details', smartQuoteState.details]
  ];

  smartQuoteContent.innerHTML = `
    <div class="smart-quote-question">
      <h3>Review your quote request</h3>
      <p>Confirm that the information below is correct.</p>
    </div>

    <div class="smart-quote-review">
      ${reviewItems
        .map(
          ([label, value]) => `
            <div class="smart-quote-review-row">
              <strong>${label}</strong>
              <span>${escapeSmartQuoteText(value)}</span>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

function saveCurrentSmartQuoteStep() {
  if (smartQuoteState.step === 4) {
    smartQuoteState.deadline =
      document.getElementById('smart-deadline')?.value || '';

    smartQuoteState.details =
      document.getElementById('smart-details')?.value.trim() || '';
  }

  if (smartQuoteState.step === 6) {
    smartQuoteState.name =
      document.getElementById('smart-name')?.value.trim() || '';

    smartQuoteState.phone =
      document.getElementById('smart-phone')?.value.trim() || '';

    smartQuoteState.email =
      document.getElementById('smart-email')?.value.trim() || '';
  }
}

function validateSmartQuoteStep() {
  smartQuoteError.textContent = '';

  if (smartQuoteState.step <= 3) {
    const stepData = smartQuoteSteps[smartQuoteState.step];

    if (!smartQuoteState[stepData.field]) {
      smartQuoteError.textContent = 'Please select an option to continue.';
      return false;
    }
  }

  if (smartQuoteState.step === 4 && !smartQuoteState.details) {
    smartQuoteError.textContent =
      'Please tell us a little about your project.';
    return false;
  }

  if (
    smartQuoteState.step === 6 &&
    (!smartQuoteState.name || !smartQuoteState.phone)
  ) {
    smartQuoteError.textContent =
      'Please enter your name and phone number.';
    return false;
  }

  return true;
}

function renderSmartQuoteStep() {
  if (!smartQuoteContent) return;

  const totalSteps = 8;
  const visibleStep = smartQuoteState.step + 1;

  smartQuoteStepLabel.textContent =
    `Step ${visibleStep} of ${totalSteps}`;

  smartQuoteProgressBar.style.width =
    `${(visibleStep / totalSteps) * 100}%`;

  smartQuoteBack.disabled = smartQuoteState.step === 0;

  smartQuoteNext.textContent =
    smartQuoteState.step === totalSteps - 1
      ? 'Open WhatsApp'
      : 'Next';

  smartQuoteError.textContent = '';

  if (smartQuoteState.step <= 3) {
    renderOptionStep(smartQuoteSteps[smartQuoteState.step]);
  } else if (smartQuoteState.step === 4) {
    renderProjectDetailsStep();
  } else if (smartQuoteState.step === 5) {
    renderUploadStep();
  } else if (smartQuoteState.step === 6) {
    renderContactStep();
  } else {
    renderReviewStep();
  }
}

function sendSmartQuoteToWhatsApp() {
  const message = [
    'Hello Imaginable Things! I would like to request a quote.',
    '',
    `Name: ${smartQuoteState.name}`,
    `Phone: ${smartQuoteState.phone}`,
    smartQuoteState.email
      ? `Email: ${smartQuoteState.email}`
      : '',
    '',
    `Product: ${smartQuoteState.product}`,
    `Personalization method: ${smartQuoteState.method}`,
    `Estimated quantity: ${smartQuoteState.quantity}`,
    `Design placement: ${smartQuoteState.placement}`,
    smartQuoteState.deadline
      ? `Needed by: ${smartQuoteState.deadline}`
      : '',
    smartQuoteState.file
      ? `Selected file: ${smartQuoteState.file.name} (${formatSmartQuoteFileSize(smartQuoteState.file.size)})`
      : '',
    smartQuoteState.file
      ? 'Please attach this same file to the WhatsApp conversation.'
      : '',
    '',
    'Project details:',
    smartQuoteState.details
  ]
    .filter(Boolean)
    .join('\n');

  const number =
    siteSettings?.quote_form?.whatsapp_number || '18603369202';

  const cleanNumber = String(number).replace(/\D/g, '');

  const url =
    `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}

document
  .querySelectorAll('a[href="#quote"]')
  .forEach((quoteLink) => {
    quoteLink.addEventListener('click', (event) => {
      event.preventDefault();
      openSmartQuote();
    });
  });

smartQuoteNext?.addEventListener('click', () => {
  saveCurrentSmartQuoteStep();

  if (!validateSmartQuoteStep()) return;

  if (smartQuoteState.step === 7) {
    sendSmartQuoteToWhatsApp();
    return;
  }

  smartQuoteState.step += 1;
  renderSmartQuoteStep();
});

smartQuoteBack?.addEventListener('click', () => {
  saveCurrentSmartQuoteStep();

  if (smartQuoteState.step === 0) return;

  smartQuoteState.step -= 1;
  renderSmartQuoteStep();
});

smartQuoteClose?.addEventListener('click', closeSmartQuote);

document
  .querySelectorAll('[data-close-smart-quote]')
  .forEach((element) => {
    element.addEventListener('click', closeSmartQuote);
  });

document.addEventListener('keydown', (event) => {
  if (
    event.key === 'Escape' &&
    smartQuoteModal?.classList.contains('is-open')
  ) {
    closeSmartQuote();
  }
});
loadServices();
loadSiteSettings();


