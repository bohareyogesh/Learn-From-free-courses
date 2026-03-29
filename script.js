// Free Course Finder — Enhanced Script
// Loads courses from courses.json, supports filtering, sorting, pagination,
// bookmarks (localStorage), dark/light theme, and aggregator platform links.

(function () {
  'use strict';

  const COURSES_PER_PAGE = 24;
  const STORAGE_KEY_BOOKMARKS = 'fcf_bookmarks';
  const STORAGE_KEY_THEME = 'fcf_theme';
  const STORAGE_KEY_APIKEY = 'fcf_openrouter_key';
  const STORAGE_KEY_USER_COURSES = 'fcf_user_courses';
  const STORAGE_KEY_REMOVED = 'fcf_removed_courses';
  const STORAGE_KEY_LAST_UPDATE = 'fcf_last_update';
  const CREATOR_NAME = 'Yogesh Mahesh Bohare';

  let baseCourses = [];
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

  // ── User Course Storage ──
  function getUserCourses() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_USER_COURSES)) || []; }
    catch { return []; }
  }
  function saveUserCourses(courses) {
    localStorage.setItem(STORAGE_KEY_USER_COURSES, JSON.stringify(courses));
  }
  function getRemovedKeys() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_REMOVED)) || []; }
    catch { return []; }
  }
  function saveRemovedKeys(keys) {
    localStorage.setItem(STORAGE_KEY_REMOVED, JSON.stringify(keys));
  }

  function addUserCourse(course) {
    const list = getUserCourses();
    const key = courseKey(course);
    if (!list.some(c => courseKey(c) === key)) {
      list.push(course);
      saveUserCourses(list);
    }
  }

  function removeCourse(key) {
    const list = getRemovedKeys();
    if (!list.includes(key)) {
      list.push(key);
      saveRemovedKeys(list);
    }
  }

  function undoRemoveCourse(key) {
    const list = getRemovedKeys().filter(k => k !== key);
    saveRemovedKeys(list);
  }

  function mergeCourses() {
    const userCourses = getUserCourses();
    const removedKeys = getRemovedKeys();
    const merged = [...baseCourses];

    userCourses.forEach(uc => {
      if (!merged.some(c => courseKey(c) === courseKey(uc))) {
        merged.push(uc);
      }
    });

    allCourses = merged.filter(c => !removedKeys.includes(courseKey(c)));
  }

  // ── Data Loading ──
  async function fetchCourses() {
    showSkeletons();
    let data = null;

    // Priority 1: global variable from courses-data.js (works on file:// and http://)
    if (window.COURSE_DATABASE && Array.isArray(window.COURSE_DATABASE) && window.COURSE_DATABASE.length > 0) {
      data = window.COURSE_DATABASE;
    }

    // Priority 2: fetch courses.json (works on http:// servers)
    if (!data) {
      try {
        const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        const resp = await fetch(base + 'courses.json', { cache: 'no-store' });
        if (resp.ok) data = await resp.json();
      } catch (err) {
        console.warn('courses.json fetch failed, using embedded data:', err);
      }
    }

    // Priority 3: minimal embedded fallback
    if (!data || !Array.isArray(data) || data.length === 0) {
      data = getEmbeddedCourses();
    }

    baseCourses = data;
    mergeCourses();
    populateFilters();
    updateHeaderStats();
    applyFilters();
    autoUpdateCheck();
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
  function updateHeaderStats() {
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
      { name: 'Anthropic Academy', url: 'https://www.anthropic.com/learn', icon: '&#9889;' },
      { name: 'OpenAI Tutorials', url: 'https://platform.openai.com/docs/tutorials', icon: '&#129302;' },
      { name: 'NVIDIA DLI', url: 'https://www.nvidia.com/en-us/training/online/', icon: '&#128187;' },
      { name: 'Cohere LLM University', url: 'https://cohere.com/llmu', icon: '&#129504;' },
      { name: 'Weights & Biases', url: 'https://www.wandb.courses/', icon: '&#128202;' },
      { name: 'Mistral AI Docs', url: 'https://docs.mistral.ai/', icon: '&#9889;' },
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

  // ── AI Recommender ──
  const aiFab = $('aiFab');
  const aiModal = $('aiModal');
  const aiModalClose = $('aiModalClose');
  const aiPrompt = $('aiPrompt');
  const aiSend = $('aiSend');
  const aiResponse = $('aiResponse');
  const settingsToggle = $('settingsToggle');
  const settingsPanel = $('settingsPanel');
  const apiKeyInput = $('apiKeyInput');
  const saveApiKeyBtn = $('saveApiKey');
  const keyStatus = $('keyStatus');

  function getApiKey() {
    return localStorage.getItem(STORAGE_KEY_APIKEY) || '';
  }

  function initApiKeyUI() {
    const key = getApiKey();
    if (key) {
      apiKeyInput.value = key;
      keyStatus.textContent = 'Key saved';
      keyStatus.className = 'key-status saved';
    } else {
      keyStatus.textContent = 'No key set';
      keyStatus.className = 'key-status missing';
    }
  }

  saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      localStorage.setItem(STORAGE_KEY_APIKEY, key);
      keyStatus.textContent = 'Key saved';
      keyStatus.className = 'key-status saved';
    } else {
      localStorage.removeItem(STORAGE_KEY_APIKEY);
      keyStatus.textContent = 'Key removed';
      keyStatus.className = 'key-status missing';
    }
  });

  aiFab.addEventListener('click', () => {
    aiModal.classList.add('open');
    initApiKeyUI();
    aiPrompt.focus();
  });

  aiModalClose.addEventListener('click', () => {
    aiModal.classList.remove('open');
  });

  aiModal.addEventListener('click', (e) => {
    if (e.target === aiModal) aiModal.classList.remove('open');
  });

  settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
  });

  aiSend.addEventListener('click', () => sendAiRequest());
  aiPrompt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAiRequest();
    }
  });

  async function sendAiRequest() {
    const question = aiPrompt.value.trim();
    if (!question) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      aiResponse.textContent = 'Please set your OpenRouter API key first. Click "API Settings" below to add it.';
      settingsPanel.classList.add('open');
      return;
    }

    aiSend.disabled = true;
    aiSend.textContent = 'Thinking...';
    aiResponse.innerHTML = '<span class="typing">Analyzing courses and generating recommendations...</span>';

    const courseSummary = allCourses.map((c, i) =>
      `${i + 1}. "${c.title}" by ${c.provider} | ${c.certificate ? 'Certificate' : 'No cert'} | ${c.isAI ? 'AI' : ''} | Domains: ${(c.domains || []).join(', ')} | URL: ${c.url}`
    ).join('\n');

    const systemPrompt = `You are a helpful course advisor. The user has access to a database of ${allCourses.length} free courses. Based on their request, recommend the BEST matching courses from this database. For each recommendation, include the course title, provider, why it's a good fit, and the URL. Format your response clearly with numbered recommendations. If fewer than 3 courses match, suggest what they could search for on the aggregator platforms. Be concise and helpful.

Here is the complete course database:
${courseSummary}`;

    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'Free Course Finder'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ],
          max_tokens: 1500,
          temperature: 0.3
        })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${resp.status}`);
      }

      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content || 'No response received.';
      aiResponse.textContent = reply;
    } catch (err) {
      aiResponse.textContent = `Error: ${err.message}\n\nPlease check your API key and try again.`;
    } finally {
      aiSend.disabled = false;
      aiSend.textContent = 'Ask AI';
    }
  }

  // ── Smart Update System ──
  const smartUpdateBtn = $('smartUpdateBtn');
  const updateModal = $('updateModal');
  const updateModalClose = $('updateModalClose');
  const findNewCoursesBtn = $('findNewCoursesBtn');
  const validateCoursesBtn = $('validateCoursesBtn');
  const updateResponse = $('updateResponse');
  const updateStats = $('updateStats');
  const updateBar = $('updateBar');
  const updateBarText = $('updateBarText');
  const updateBarAction = $('updateBarAction');
  const updateBarDismiss = $('updateBarDismiss');

  smartUpdateBtn.addEventListener('click', () => {
    if (!getApiKey()) {
      aiFab.click();
      settingsPanel.classList.add('open');
      return;
    }
    updateModal.classList.add('open');
  });

  updateModalClose.addEventListener('click', () => updateModal.classList.remove('open'));
  updateModal.addEventListener('click', (e) => { if (e.target === updateModal) updateModal.classList.remove('open'); });

  updateBarDismiss.addEventListener('click', () => updateBar.classList.remove('visible'));
  updateBarAction.addEventListener('click', () => {
    updateBar.classList.remove('visible');
    updateModal.classList.add('open');
  });

  async function callOpenRouter(systemMsg, userMsg) {
    const apiKey = getApiKey();
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.href,
        'X-Title': 'Free Course Finder'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg }
        ],
        max_tokens: 3000,
        temperature: 0.2
      })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${resp.status}`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  }

  findNewCoursesBtn.addEventListener('click', async () => {
    findNewCoursesBtn.disabled = true;
    findNewCoursesBtn.textContent = 'Searching...';
    updateResponse.innerHTML = '<span class="typing">Searching the internet for new free courses...</span>';

    const existingTitles = allCourses.map(c => c.title).join(', ');

    try {
      const reply = await callOpenRouter(
        `You are a course discovery assistant. The user has a database of free courses. Search your knowledge for NEW free courses and certifications available on the internet in 2025-2026 that are NOT already in their database. Focus on courses from major platforms that are genuinely free (not free trials).

Return ONLY a valid JSON array of new course objects. Each object must have: title, provider, url, description, certificate (boolean), active (boolean), isAI (boolean), domains (string array). Return at least 5 and at most 15 courses. Do NOT include any courses already in the database. Return ONLY the JSON array, no other text.`,
        `Here are the courses already in my database (do NOT suggest these):\n${existingTitles}\n\nFind new free courses available on the internet that are NOT in this list.`
      );

      let newCourses = [];
      try {
        const jsonMatch = reply.match(/\[[\s\S]*\]/);
        if (jsonMatch) newCourses = JSON.parse(jsonMatch[0]);
      } catch {
        updateResponse.textContent = 'Could not parse AI response. Raw response:\n\n' + reply;
        return;
      }

      if (!newCourses.length) {
        updateResponse.textContent = 'No new courses found. Your database appears up to date!';
        return;
      }

      let html = `<p style="font-weight:700;margin-bottom:10px;">Found ${newCourses.length} new courses:</p><ul class="update-list">`;
      newCourses.forEach((c, i) => {
        html += `<li class="update-item" id="new-${i}">
          <div class="info">
            <div class="title">${escapeHtml(c.title)}</div>
            <div class="provider">${escapeHtml(c.provider)}</div>
            <div class="desc">${escapeHtml(c.description || '')}</div>
          </div>
          <button class="btn-add-course" data-idx="${i}">+ Add</button>
        </li>`;
      });
      html += '</ul>';
      updateResponse.innerHTML = html;

      updateResponse.querySelectorAll('.btn-add-course').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-idx'));
          const course = newCourses[idx];
          if (course) {
            addUserCourse(course);
            mergeCourses();
            populateFilters();
            updateStatsFn();
            applyFilters();
            btn.textContent = 'Added!';
            btn.disabled = true;
            btn.style.background = 'var(--text-muted)';
          }
        });
      });

      updateStats.textContent = `${newCourses.length} new courses found. Click "Add" to include them.`;
    } catch (err) {
      updateResponse.textContent = `Error: ${err.message}`;
    } finally {
      findNewCoursesBtn.disabled = false;
      findNewCoursesBtn.textContent = '\u{1F50D} Find New Courses';
    }
  });

  validateCoursesBtn.addEventListener('click', async () => {
    validateCoursesBtn.disabled = true;
    validateCoursesBtn.textContent = 'Validating...';
    updateResponse.innerHTML = '<span class="typing">Analyzing courses for validity...</span>';

    const courseList = allCourses.map(c => `"${c.title}" by ${c.provider} | URL: ${c.url}`).join('\n');

    try {
      const reply = await callOpenRouter(
        `You are a course validation assistant. Analyze the following list of free online courses. Identify courses that are likely NO LONGER available, have been discontinued, moved to paid-only, or have broken/invalid URLs based on your knowledge. 

Return ONLY a valid JSON array of objects with: { "title": "...", "url": "...", "reason": "why it may be invalid" }. If all courses appear valid, return an empty array []. Return ONLY the JSON array, no other text.`,
        `Validate these courses:\n${courseList}`
      );

      let invalidCourses = [];
      try {
        const jsonMatch = reply.match(/\[[\s\S]*\]/);
        if (jsonMatch) invalidCourses = JSON.parse(jsonMatch[0]);
      } catch {
        updateResponse.textContent = 'Could not parse AI response. Raw response:\n\n' + reply;
        return;
      }

      if (!invalidCourses.length) {
        updateResponse.innerHTML = '<p style="color:var(--green);font-weight:700;">All courses appear valid! Your database is up to date.</p>';
        updateStats.textContent = 'Validation complete. 0 issues found.';
        return;
      }

      let html = `<p style="font-weight:700;margin-bottom:10px;">${invalidCourses.length} potentially invalid courses found:</p><ul class="update-list">`;
      invalidCourses.forEach((ic, i) => {
        const match = allCourses.find(c => c.url === ic.url || c.title === ic.title);
        const key = match ? courseKey(match) : '';
        html += `<li class="update-item" id="inv-${i}">
          <div class="info">
            <div class="title">${escapeHtml(ic.title)}</div>
            <div class="desc" style="color:var(--red);">${escapeHtml(ic.reason || 'May be unavailable')}</div>
          </div>
          <button class="btn-remove-course" data-key="${escapeHtml(key)}" ${!key ? 'disabled' : ''}>Remove</button>
        </li>`;
      });
      html += '</ul>';
      updateResponse.innerHTML = html;

      updateResponse.querySelectorAll('.btn-remove-course').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          if (key) {
            removeCourse(key);
            mergeCourses();
            populateFilters();
            updateStatsFn();
            applyFilters();
            btn.textContent = 'Removed';
            btn.disabled = true;
            btn.style.background = 'var(--text-muted)';
          }
        });
      });

      updateStats.textContent = `${invalidCourses.length} issues found. Review and remove invalid courses.`;
    } catch (err) {
      updateResponse.textContent = `Error: ${err.message}`;
    } finally {
      validateCoursesBtn.disabled = false;
      validateCoursesBtn.textContent = '\u2713 Validate Existing';
    }
  });

  function updateStatsFn() { updateHeaderStats(); }

  // ── Auto Update Check ──
  function autoUpdateCheck() {
    if (!navigator.onLine || !getApiKey()) return;

    const lastUpdate = parseInt(localStorage.getItem(STORAGE_KEY_LAST_UPDATE) || '0');
    const hoursSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60);

    if (hoursSinceUpdate < 24) return;

    localStorage.setItem(STORAGE_KEY_LAST_UPDATE, Date.now().toString());
    updateBarText.textContent = 'You\'re online! Use Smart Update to find new courses and validate existing ones.';
    updateBar.classList.add('visible');
  }

  // ── Creator Attribution Protection ──
  function protectCreator() {
    const badge = $('creatorBadge');
    const footer = $('creatorFooter');
    const expectedBadge = `Created by <strong>${CREATOR_NAME}</strong>`;
    const expectedFooter = `Created by ${CREATOR_NAME}`;

    function restore() {
      if (badge && badge.innerHTML !== expectedBadge) badge.innerHTML = expectedBadge;
      if (footer && footer.textContent !== expectedFooter) footer.textContent = expectedFooter;
    }

    restore();

    if (typeof MutationObserver !== 'undefined') {
      const observe = (el) => {
        if (!el) return;
        new MutationObserver(restore).observe(el, {
          childList: true, characterData: true, subtree: true
        });
      };
      observe(badge);
      observe(footer);
    }

    setInterval(restore, 5000);
  }

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
  initApiKeyUI();
  renderAggregatorLinks();
  protectCreator();
  fetchCourses();

})();
