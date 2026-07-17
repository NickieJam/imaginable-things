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
        <p>“${item.quote}”</p>
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

