/* ============================================
   Nitin's Blog — Main JavaScript
   ============================================ */

(function () {
  'use strict';

  // ---- Theme Toggle ----
  const themeToggle = document.getElementById('theme-toggle');
  const storedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  // Initialize theme
  if (storedTheme) {
    setTheme(storedTheme);
  } else {
    setTheme(prefersDark ? 'dark' : 'light');
  }

  themeToggle.addEventListener('click', function () {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // ---- Navbar scroll effect ----
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  window.addEventListener('scroll', function () {
    const scrollY = window.scrollY;
    if (scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    lastScroll = scrollY;
  }, { passive: true });

  // ---- Scroll reveal ----
  const revealElements = document.querySelectorAll('.section, .post-card, .about-card');

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal', 'visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(function (el) {
    el.classList.add('reveal');
    observer.observe(el);
  });

  // ---- Year in footer ----
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // ---- Load posts from posts.json ----
  var postsGrid = document.getElementById('posts-grid');
  var emptyState = document.getElementById('empty-state');
  var postCount = document.getElementById('post-count');

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function estimateReadTime(text) {
    if (!text) return '1 min read';
    var words = text.split(/\s+/).length;
    var mins = Math.max(1, Math.round(words / 200));
    return mins + ' min read';
  }

  function renderPosts(posts) {
    if (!posts || posts.length === 0) {
      if (emptyState) emptyState.style.display = '';
      if (postCount) postCount.textContent = '0';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (postCount) postCount.textContent = String(posts.length);

    // Sort by date, newest first
    posts.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    posts.forEach(function (post) {
      var card = document.createElement('a');
      card.className = 'post-card';
      card.href = post.url || '#';

      var tagHTML = post.tag
        ? '<span class="post-tag">' + escapeHtml(post.tag) + '</span>'
        : '';

      card.innerHTML =
        tagHTML +
        '<h3 class="post-title">' + escapeHtml(post.title) + '</h3>' +
        '<p class="post-excerpt">' + escapeHtml(post.excerpt || '') + '</p>' +
        '<div class="post-meta">' +
          '<span>' + escapeHtml(formatDate(post.date)) + '</span>' +
          '<span class="post-meta-divider"></span>' +
          '<span>' + escapeHtml(post.readTime || estimateReadTime(post.excerpt)) + '</span>' +
        '</div>';

      postsGrid.insertBefore(card, emptyState);

      // Observe for scroll reveal
      card.classList.add('reveal');
      observer.observe(card);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // Fetch posts from JSON manifest
  fetch('posts/posts.json')
    .then(function (res) {
      if (!res.ok) throw new Error('No posts found');
      return res.json();
    })
    .then(renderPosts)
    .catch(function () {
      // No posts file yet — show empty state
      if (emptyState) emptyState.style.display = '';
    });

  // ---- Smooth anchor scrolling ----
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
})();
