// Free Course Finder — Enhanced Script
// Loads courses from courses.json, supports filtering, sorting, pagination,
// bookmarks (localStorage), dark/light theme, and aggregator platform links.

(function () {
  'use strict';

  const COURSES_PER_PAGE = 24;
  const STORAGE_KEY_BOOKMARKS = 'fcf_bookmarks';
  const STORAGE_KEY_THEME = 'fcf_theme';

  let allCourses = [];
  let filteredCourses = [];
  let currentPage = 1;
  let bookmarks = loadBookmarks();

  // ── DOM References ──
  const $ = (id) => document.getElementById(id);
  const resultsDiv = $('results');
  const searchInput = $('searchInput');
  const filterAI = $('filterAI');
  const filterCert = $('filterCertificate');
  const filterBookmarksEl = $('filterBookmarks');
  const domainFilter = $('domainFilter');
  const providerFilter = $('providerFilter');
  const sortSelect = $('sortSelect');
  const courseCount = $('courseCount');
  const paginationDiv = $('pagination');
  const resetBtn = $('resetFilters');
  const themeToggle = $('themeToggle');
  const backToTop = $('backToTop');
  const aggregatorLinks = $('aggregatorLinks');

  // ── Theme ──
  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    updateThemeIcon();
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY_THEME, next);
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeToggle.innerHTML = isDark ? '&#9728;' : '&#9790;';
  }

  // ── Bookmarks ──
  function loadBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKMARKS)) || [];
    } catch { return []; }
  }

  function saveBookmarks() {
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarks));
  }

  function courseKey(course) {
    return course.title + '||' + course.url;
  }

  function toggleBookmark(key) {
    const idx = bookmarks.indexOf(key);
    if (idx > -1) {
      bookmarks.splice(idx, 1);
    } else {
      bookmarks.push(key);
    }
    saveBookmarks();
    applyFilters();
  }

  function isBookmarked(key) {
    return bookmarks.includes(key);
  }

  // ── Data Loading ──
  async function fetchCourses() {
    showSkeletons();
    let data = null;

    if (window.location.protocol !== 'file:') {
      try {
        const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        const resp = await fetch(base + 'courses.json', { cache: 'no-store' });
        if (resp.ok) data = await resp.json();
      } catch (err) {
        console.warn('Failed to load courses.json:', err);
      }
    }

    if (!data || !Array.isArray(data)) {
      data = getEmbeddedCourses();
    }

    allCourses = data;
    populateFilters();
    updateStats();
    applyFilters();
  }

  function showSkeletons() {
    let html = '';
    for (let i = 0; i < 6; i++) {
      html += `<div class="skeleton-card">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
      </div>`;
    }
    resultsDiv.innerHTML = html;
  }

  // ── Populate Filter Dropdowns ──
  function populateFilters() {
    const providers = new Set();
    const domains = new Set();

    allCourses.forEach(c => {
      providers.add(c.provider);
      if (c.domains) c.domains.forEach(d => domains.add(d));
    });

    const sortedProviders = [...providers].sort();
    const sortedDomains = [...domains].sort();

    providerFilter.innerHTML = '<option value="">All Providers</option>';
    sortedProviders.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      providerFilter.appendChild(opt);
    });

    domainFilter.innerHTML = '<option value="">All Domains</option>';
    sortedDomains.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      domainFilter.appendChild(opt);
    });
  }

  // ── Stats ──
  function updateStats() {
    const providers = new Set(allCourses.map(c => c.provider));
    const domains = new Set();
    allCourses.forEach(c => { if (c.domains) c.domains.forEach(d => domains.add(d)); });
    const certs = allCourses.filter(c => c.certificate).length;

    $('totalCourses').textContent = allCourses.length;
    $('totalProviders').textContent = providers.size;
    $('totalDomains').textContent = domains.size;
    $('totalCerts').textContent = certs;
  }

  // ── Filtering ──
  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const onlyAI = filterAI.checked;
    const onlyCert = filterCert.checked;
    const onlyBookmarks = filterBookmarksEl.checked;
    const selectedDomain = domainFilter.value;
    const selectedProvider = providerFilter.value;

    filteredCourses = allCourses.filter(course => {
      if (onlyAI && !course.isAI) return false;
      if (onlyCert && !course.certificate) return false;
      if (onlyBookmarks && !isBookmarked(courseKey(course))) return false;
      if (selectedDomain && (!course.domains || !course.domains.includes(selectedDomain))) return false;
      if (selectedProvider && course.provider !== selectedProvider) return false;

      if (query) {
        const tokens = query.split(/\s+/);
        return tokens.every(token => {
          const t = course.title.toLowerCase();
          const p = course.provider.toLowerCase();
          const d = course.description.toLowerCase();
          const doms = (course.domains || []).join(' ').toLowerCase();
          return t.includes(token) || p.includes(token) || d.includes(token) || doms.includes(token);
        });
      }
      return true;
    });

    applySorting();
    currentPage = 1;
    renderPage();
  }

  function applySorting() {
    const sort = sortSelect.value;
    if (sort === 'az') {
      filteredCourses.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'za') {
      filteredCourses.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sort === 'provider') {
      filteredCourses.sort((a, b) => a.provider.localeCompare(b.provider) || a.title.localeCompare(b.title));
    }
  }

  // ── Rendering ──
  function renderPage() {
    const total = filteredCourses.length;
    const totalPages = Math.max(1, Math.ceil(total / COURSES_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * COURSES_PER_PAGE;
    const end = Math.min(start + COURSES_PER_PAGE, total);
    const pageCourses = filteredCourses.slice(start, end);

    courseCount.innerHTML = total === 0
      ? 'No courses match your filters'
      : `Showing <span>${start + 1}–${end}</span> of <span>${total}</span> courses`;

    renderCourses(pageCourses);
    renderPagination(totalPages);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderCourses(list) {
    if (!list || list.length === 0) {
      resultsDiv.innerHTML = `<div class="empty-state">
        <div class="icon">&#128218;</div>
        <h3>No courses found</h3>
        <p>Try adjusting your search or filters to discover more courses.</p>
      </div>`;
      return;
    }

    resultsDiv.innerHTML = list.map(course => {
      const key = courseKey(course);
      const bookmarked = isBookmarked(key);
      const domainBadges = (course.domains || []).map(d =>
        `<span class="badge badge-domain">${escapeHtml(d)}</span>`
      ).join('');

      return `<div class="course-card">
        <div class="card-header">
          <div class="card-title">${escapeHtml(course.title)}</div>
          <button class="bookmark-btn ${bookmarked ? 'active' : ''}"
                  data-key="${escapeHtml(key)}"
                  title="${bookmarked ? 'Remove bookmark' : 'Bookmark this course'}"
                  aria-label="${bookmarked ? 'Remove bookmark' : 'Bookmark'}">
            ${bookmarked ? '&#9733;' : '&#9734;'}
          </button>
        </div>
        <div class="card-provider">${escapeHtml(course.provider)}</div>
        <div class="card-desc">${escapeHtml(course.description)}</div>
        <div class="card-badges">
          ${course.certificate
            ? '<span class="badge badge-cert">&#10003; Certificate</span>'
            : '<span class="badge badge-no-cert">No Certificate</span>'}
          ${course.isAI ? '<span class="badge badge-ai">&#9889; AI</span>' : ''}
          ${domainBadges}
        </div>
        <div class="card-actions">
          <a class="btn btn-enroll" href="${escapeHtml(course.url)}" target="_blank" rel="noopener">
            Enroll Free &#8594;
          </a>
          <button class="btn btn-share" data-title="${escapeHtml(course.title)}" data-url="${escapeHtml(course.url)}">
            Share
          </button>
        </div>
      </div>`;
    }).join('');
  }

  // ── Pagination ──
  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      paginationDiv.innerHTML = '';
      return;
    }

    let html = `<button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Prev</button>`;

    const maxVisible = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      html += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) html += `<span style="color:var(--text-muted);padding:0 4px;">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span style="color:var(--text-muted);padding:0 4px;">...</span>`;
      html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>Next &raquo;</button>`;

    paginationDiv.innerHTML = html;
  }

  // ── Aggregator Links ──
  function renderAggregatorLinks() {
    const platforms = [
      { name: 'Coursera', url: 'https://www.coursera.org/courses?query=free', icon: '&#127891;' },
      { name: 'edX', url: 'https://www.edx.org/search?tab=course', icon: '&#127891;' },
      { name: 'Khan Academy', url: 'https://www.khanacademy.org/', icon: '&#128218;' },
      { name: 'MIT OpenCourseWare', url: 'https://ocw.mit.edu/', icon: '&#127979;' },
      { name: 'freeCodeCamp', url: 'https://www.freecodecamp.org/', icon: '&#128187;' },
      { name: 'The Odin Project', url: 'https://www.theodinproject.com/', icon: '&#9876;' },
      { name: 'Kaggle Learn', url: 'https://www.kaggle.com/learn', icon: '&#128202;' },
      { name: 'HubSpot Academy', url: 'https://academy.hubspot.com/', icon: '&#128640;' },
      { name: 'Google Skillshop', url: 'https://skillshop.exceedlms.com/', icon: '&#127919;' },
      { name: 'Microsoft Learn', url: 'https://learn.microsoft.com/', icon: '&#128421;' },
      { name: 'AWS Skill Builder', url: 'https://explore.skillbuilder.aws/', icon: '&#9729;' },
      { name: 'IBM SkillsBuild', url: 'https://skillsbuild.org/', icon: '&#128300;' },
      { name: 'Salesforce Trailhead', url: 'https://trailhead.salesforce.com/', icon: '&#127956;' },
      { name: 'Cisco NetAcad', url: 'https://www.netacad.com/', icon: '&#127760;' },
      { name: 'Alison', url: 'https://alison.com/', icon: '&#127891;' },
      { name: 'Saylor Academy', url: 'https://www.saylor.org/', icon: '&#128214;' },
      { name: 'Cognitive Class', url: 'https://cognitiveclass.ai/', icon: '&#129504;' },
      { name: 'Class Central', url: 'https://www.classcentral.com/collection/free-certificates', icon: '&#127942;' },
      { name: 'OpenLearn', url: 'https://www.open.edu/openlearn/', icon: '&#128216;' },
      { name: 'FutureLearn', url: 'https://www.futurelearn.com/', icon: '&#128640;' },
      { name: 'SWAYAM', url: 'https://swayam.gov.in/', icon: '&#127470;' },
      { name: 'NPTEL', url: 'https://nptel.ac.in/', icon: '&#127979;' },
      { name: 'Great Learning', url: 'https://www.mygreatlearning.com/academy', icon: '&#128161;' },
      { name: 'DeepLearning.AI', url: 'https://www.deeplearning.ai/courses/', icon: '&#129302;' },
      { name: 'fast.ai', url: 'https://course.fast.ai/', icon: '&#9889;' },
      { name: 'Hugging Face', url: 'https://huggingface.co/learn', icon: '&#129303;' },
      { name: 'MongoDB University', url: 'https://learn.mongodb.com/', icon: '&#127811;' },
      { name: 'Codecademy', url: 'https://www.codecademy.com/catalog', icon: '&#128187;' },
      { name: 'SoloLearn', url: 'https://www.sololearn.com/', icon: '&#128241;' },
      { name: 'Exercism', url: 'https://exercism.org/', icon: '&#127947;' },
    ];

    aggregatorLinks.innerHTML = platforms.map(p =>
      `<a class="agg-link" href="${p.url}" target="_blank" rel="noopener">
        <span class="agg-icon">${p.icon}</span>
        ${escapeHtml(p.name)}
      </a>`
    ).join('');
  }

  // ── Event Listeners ──
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, 200);
  });

  filterAI.addEventListener('change', applyFilters);
  filterCert.addEventListener('change', applyFilters);
  filterBookmarksEl.addEventListener('change', applyFilters);
  domainFilter.addEventListener('change', applyFilters);
  providerFilter.addEventListener('change', applyFilters);
  sortSelect.addEventListener('change', applyFilters);

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterAI.checked = false;
    filterCert.checked = false;
    filterBookmarksEl.checked = false;
    domainFilter.value = '';
    providerFilter.value = '';
    sortSelect.value = 'default';
    applyFilters();
  });

  themeToggle.addEventListener('click', toggleTheme);

  resultsDiv.addEventListener('click', (e) => {
    const shareBtn = e.target.closest('.btn-share');
    if (shareBtn) {
      const title = shareBtn.getAttribute('data-title');
      const url = shareBtn.getAttribute('data-url');
      navigator.clipboard.writeText(`${title} — ${url}`).then(() => {
        shareBtn.textContent = 'Copied!';
        setTimeout(() => { shareBtn.textContent = 'Share'; }, 2000);
      }).catch(() => {
        shareBtn.textContent = 'Failed';
        setTimeout(() => { shareBtn.textContent = 'Share'; }, 2000);
      });
      return;
    }

    const bookmarkBtn = e.target.closest('.bookmark-btn');
    if (bookmarkBtn) {
      toggleBookmark(bookmarkBtn.getAttribute('data-key'));
    }
  });

  paginationDiv.addEventListener('click', (e) => {
    const btn = e.target.closest('.page-btn');
    if (!btn || btn.disabled) return;
    const page = btn.getAttribute('data-page');
    if (page === 'prev') currentPage = Math.max(1, currentPage - 1);
    else if (page === 'next') currentPage++;
    else currentPage = parseInt(page, 10);
    renderPage();
    window.scrollTo({ top: resultsDiv.offsetTop - 100, behavior: 'smooth' });
  });

  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ── Embedded Fallback ──
  function getEmbeddedCourses() {
    return [
      { title: "CS50's Introduction to Computer Science", provider: "Harvard University", url: "https://cs50.harvard.edu/x/", description: "Harvard's legendary CS50 covers computer science and programming fundamentals.", certificate: true, active: true, domains: ["Information Technology & Computing", "Programming Languages"] },
      { title: "Google Machine Learning Crash Course", provider: "Google", url: "https://developers.google.com/machine-learning/crash-course", description: "Fast-paced, practical introduction to machine learning with TensorFlow APIs.", certificate: false, active: true, isAI: true, domains: ["AI & ML"] },
      { title: "Machine Learning by Andrew Ng", provider: "Coursera (Stanford / DeepLearning.AI)", url: "https://www.coursera.org/specializations/machine-learning-introduction", description: "The definitive machine learning course covering supervised and unsupervised learning.", certificate: true, active: true, isAI: true, domains: ["AI & ML"] },
      { title: "freeCodeCamp Responsive Web Design", provider: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/", description: "Learn HTML, CSS and modern responsive design techniques.", certificate: true, active: true, domains: ["Web Development"] },
      { title: "IBM SkillsBuild – AI Foundations", provider: "IBM", url: "https://skillsbuild.org/students", description: "Free AI learning pathways with digital credentials.", certificate: true, active: true, isAI: true, domains: ["AI & ML"] },
      { title: "Microsoft Azure Fundamentals", provider: "Microsoft Learn", url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/", description: "Self-paced learning for the Azure Fundamentals certification.", certificate: true, active: true, domains: ["Cloud Computing"] },
      { title: "AWS Educate – Cloud Career Pathways", provider: "Amazon Web Services", url: "https://www.awseducate.com/", description: "Free cloud learning resources and career pathways.", certificate: true, active: true, domains: ["Cloud Computing"] },
      { title: "Kaggle – Intro to Machine Learning", provider: "Kaggle", url: "https://www.kaggle.com/learn/intro-to-machine-learning", description: "Learn core ML ideas and build your first models.", certificate: true, active: true, isAI: true, domains: ["AI & ML"] },
      { title: "Khan Academy – Algebra", provider: "Khan Academy", url: "https://www.khanacademy.org/math/algebra", description: "Comprehensive algebra with interactive exercises and videos.", certificate: false, active: true, domains: ["Mathematics"] },
      { title: "HubSpot Inbound Marketing Certification", provider: "HubSpot Academy", url: "https://academy.hubspot.com/courses/inbound-marketing", description: "Master inbound marketing strategy with free certification.", certificate: true, active: true, domains: ["Digital Marketing"] },
      { title: "The Odin Project – Full Stack JavaScript", provider: "The Odin Project", url: "https://www.theodinproject.com/paths/full-stack-javascript", description: "Comprehensive, project-based full-stack curriculum.", certificate: false, active: true, domains: ["Web Development", "Programming Languages"] },
      { title: "Cisco Introduction to Cybersecurity", provider: "Cisco", url: "https://www.netacad.com/courses/cybersecurity/introduction-cybersecurity", description: "Beginner-friendly cybersecurity course with certificate.", certificate: true, active: true, domains: ["Cybersecurity"] },
    ];
  }

  // ── Init ──
  initTheme();
  renderAggregatorLinks();
  fetchCourses();

})();
