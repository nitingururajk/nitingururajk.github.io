(function () {
  'use strict';
  var root = document.documentElement;
  var themeToggle = document.getElementById('theme-toggle');
  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  function updateThemeButton() {
    if (!themeToggle) return;
    var dark = root.dataset.theme === 'dark';
    themeToggle.setAttribute('aria-label', 'Switch to ' + (dark ? 'light' : 'dark') + ' theme');
    themeToggle.setAttribute('aria-pressed', String(dark));
    themeToggle.title = themeToggle.getAttribute('aria-label');
    var themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = dark ? '#18221c' : '#f6f5ef';
    var favicon = document.querySelector('link[rel="icon"][data-logo-light]');
    if (favicon) favicon.href = dark ? favicon.dataset.logoDark : favicon.dataset.logoLight;
  }
  systemTheme.addEventListener('change', function (event) {
    if (root.dataset.themePreference !== 'system') return;
    root.dataset.theme = event.matches ? 'dark' : 'light';
    updateThemeButton();
  });
  if (themeToggle) {
    themeToggle.hidden = false;
    updateThemeButton();
    themeToggle.addEventListener('click', function () {
      var theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.themePreference = theme;
      root.dataset.theme = theme;
      try { localStorage.setItem('theme', theme); } catch (_) { /* Storage is optional. */ }
      updateThemeButton();
    });
  }
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var grid = document.getElementById('posts-grid');
  var filters = document.getElementById('post-filters');
  var dialog = document.getElementById('post-preview');
  var activeFilter = 'all';
  var lastPreviewTrigger;
  function element(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }
  function localURL(path) {
    if (typeof path !== 'string' || !path.trim()) return null;
    try {
      var url = new URL(path, location.href);
      return url.origin === location.origin && /^(https?:|file:)$/.test(url.protocol) ? url.href : null;
    } catch (_) { return null; }
  }
  function formatDate(value) {
    return new Date(value + 'T12:00:00').toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'});
  }
  function filterPosts(filter) {
    activeFilter = filter;
    var visible = 0;
    grid.querySelectorAll('.post-card').forEach(function (card) {
      card.hidden = filter !== 'all' && card.dataset.category !== filter;
      if (!card.hidden) visible++;
    });
    filters.querySelectorAll('button').forEach(function (button) {
      var selected = button.dataset.filter === filter;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    document.getElementById('filter-status').textContent = visible + (visible === 1 ? ' article' : ' articles') + (filter === 'all' ? ' shown.' : ' in ' + filter + '.');
  }
  function previewCard(card, trigger) {
    var heading = card.querySelector('.post-title');
    document.getElementById('preview-title').textContent = heading.textContent;
    document.getElementById('preview-category').textContent = card.dataset.category + ' / Preview';
    document.getElementById('preview-meta').textContent = card.querySelector('time').textContent + ' · ' + card.querySelector('.read-time').textContent;
    var image = card.querySelector('.post-art img');
    document.getElementById('preview-image').src = image.src;
    document.getElementById('preview-image').alt = image.dataset.description || '';
    document.getElementById('preview-body').replaceChildren();
    var source = card.querySelector('.preview-source');
    if (source) Array.from(source.children).forEach(function (child) { document.getElementById('preview-body').append(child.cloneNode(true)); });
    document.getElementById('preview-link').href = heading.querySelector('a').href;
    lastPreviewTrigger = trigger;
    dialog.showModal();
    document.body.classList.add('has-preview');
    dialog.scrollTop = 0;
    dialog.querySelector('.preview-close').focus({preventScroll:true});
  }
  if (grid && dialog && typeof dialog.showModal === 'function') {
    grid.querySelectorAll('.preview-button').forEach(function (button) { button.hidden = false; });
    grid.addEventListener('click', function (event) {
      var trigger = event.target.closest('.preview-button');
      if (trigger) previewCard(trigger.closest('.post-card'), trigger);
    });
    dialog.querySelector('.preview-close').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('close', function () {
      document.body.classList.remove('has-preview');
      if (lastPreviewTrigger && lastPreviewTrigger.isConnected) lastPreviewTrigger.focus({preventScroll:true});
    });
  }
  if (grid && filters) {
    filters.hidden = false;
    filters.addEventListener('click', function (event) {
      var button = event.target.closest('[data-filter]');
      if (button) filterPosts(button.dataset.filter);
    });
    // Static cards remain readable if the manifest or JavaScript is unavailable.
    fetch('posts/posts.json').then(function (response) {
      if (!response.ok) throw new Error('Post manifest unavailable');
      return response.json();
    }).then(function (posts) {
      if (!Array.isArray(posts) || posts.length === 0) return;
      var template = grid.querySelector('.post-card');
      var fragment = document.createDocumentFragment();
      var topics = [];
      posts.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).forEach(function (post, index) {
        var url = localURL(post.url);
        if (!url || !post.title || !post.date) return;
        var card = template.cloneNode(true);
        card.classList.toggle('featured', index === 0);
        card.dataset.category = post.tag || 'Notes';
        if (!topics.includes(card.dataset.category)) topics.push(card.dataset.category);
        card.querySelectorAll('a').forEach(function (link) { link.href = url; });
        var image = card.querySelector('.post-art img');
        image.src = localURL(post.image) || 'assets/images/notebook-desk.webp';
        image.dataset.description = post.imageAlt || '';
        image.loading = index === 0 ? 'eager' : 'lazy';
        card.querySelector('.post-tag').textContent = card.dataset.category;
        var entry = card.querySelector('.featured-label, .entry-number');
        entry.className = index === 0 ? 'featured-label' : 'entry-number';
        entry.textContent = index === 0 ? '✳ Latest post' : 'Post ' + (post.number || String(posts.length - index).padStart(2, '0'));
        card.querySelector('.post-title a').textContent = post.title;
        card.querySelector('.post-excerpt').textContent = post.excerpt || '';
        card.querySelector('time').dateTime = post.date;
        card.querySelector('time').textContent = formatDate(post.date);
        card.querySelector('.read-time').textContent = post.readTime || '';
        var source = card.querySelector('.preview-source');
        source.replaceChildren(element('p', '', post.preview || post.excerpt));
        if (Array.isArray(post.takeaways) && post.takeaways.length) {
          var list = element('ul');
          post.takeaways.forEach(function (takeaway) { list.append(element('li', '', takeaway)); });
          source.append(list);
        }
        card.querySelector('.preview-button').hidden = !(dialog && typeof dialog.showModal === 'function');
        fragment.append(card);
      });
      if (!fragment.childElementCount) return;
      var count = fragment.childElementCount;
      grid.replaceChildren(fragment);
      document.getElementById('post-count').textContent = String(count).padStart(2, '0') + (count === 1 ? ' post' : ' posts');
      filters.replaceChildren();
      ['all'].concat(topics).forEach(function (topic) {
        var button = element('button', 'filter-button', topic === 'all' ? 'All posts ' : topic);
        button.type = 'button';
        button.dataset.filter = topic;
        if (topic === 'all') button.append(element('span', '', String(count).padStart(2, '0')));
        filters.append(button);
      });
      filterPosts(topics.includes(activeFilter) ? activeFilter : 'all');
    }).catch(function () { /* Keep the complete static article cards and previews. */ });
  }

  var progress = document.getElementById('reading-progress');
  var articleBody = document.querySelector('.post-body');
  if (progress && articleBody) {
    var scheduled = false;
    function updateProgress() {
      var start = articleBody.getBoundingClientRect().top + window.scrollY;
      var end = start + articleBody.offsetHeight - window.innerHeight;
      var ratio = Math.max(0, Math.min(1, (window.scrollY - start + 100) / Math.max(1, end - start)));
      progress.style.transform = 'scaleX(' + ratio + ')';
      scheduled = false;
    }
    window.addEventListener('scroll', function () {
      if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); }
    }, {passive:true});
    window.addEventListener('resize', updateProgress);
    window.addEventListener('load', updateProgress);
    updateProgress();
  }
  if (navigator.clipboard && window.isSecureContext) {
    document.querySelectorAll('.post-body pre').forEach(function (pre, index) {
      var code = pre.querySelector('code');
      if (!code) return;
      var button = element('button', 'copy-code', 'Copy code');
      button.type = 'button';
      button.setAttribute('aria-label', 'Copy code example ' + (index + 1));
      button.addEventListener('click', function () {
        navigator.clipboard.writeText(code.textContent).then(function () {
          button.textContent = 'Copied';
          button.setAttribute('aria-label', 'Code copied');
          setTimeout(function () { button.textContent = 'Copy code'; button.setAttribute('aria-label', 'Copy code example ' + (index + 1)); }, 2000);
        }).catch(function () { button.textContent = 'Select to copy'; });
      });
      pre.append(button);
    });
  }
})();
