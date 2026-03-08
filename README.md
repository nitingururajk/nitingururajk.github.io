# Nitin's Blog

My personal blog, hosted on GitHub Pages at **nitingururajk.github.io**.

## Structure

```
├── index.html              # Home page
├── posts/
│   ├── posts.json          # Blog post manifest (loaded by JS)
│   └── _template.html      # Template — copy this to create new posts
├── assets/
│   ├── css/
│   │   ├── style.css       # Global styles
│   │   └── post.css        # Blog post page styles
│   ├── js/
│   │   └── main.js         # Theme toggle, scroll effects, post loader
│   └── images/             # Store images here
```

## Adding a New Post

1. Copy `posts/_template.html` to `posts/my-post-slug.html`
2. Edit the HTML with your post content
3. Add an entry to `posts/posts.json`:

```json
[
  {
    "title": "My First Post",
    "excerpt": "A short description of the post.",
    "date": "2026-03-08",
    "tag": "Code",
    "url": "posts/my-first-post.html",
    "readTime": "4 min read"
  }
]
```

4. Commit and push — GitHub Pages will deploy automatically.

## Features

- **Dark/Light mode** with system preference detection and localStorage persistence
- **Responsive** — works on mobile, tablet, and desktop
- **Animated** — scroll reveals, gradient text, glow effects, film grain overlay
- **Zero dependencies** — pure HTML, CSS, and vanilla JavaScript
- **Fast** — no build step, no framework overhead

## Setup

1. Create a GitHub repo named `<your-username>.github.io`
2. Push this code to the `main` branch
3. Go to **Settings → Pages** and set source to `main` branch
4. Your blog will be live at `https://<your-username>.github.io`

For this deployed copy, the live URL is `https://nitingururajk.github.io`.
