# Nitin's Blog

My blog about LLM inference and projects I build. Published at [nitingururajk.github.io](https://nitingururajk.github.io).

The blog uses static HTML, CSS, and vanilla JavaScript. There is no build step or package installation.

## Design and features

- A warm editorial layout, generated photographic covers, and light and dark themes.
- Locally hosted Newsreader and DM Sans fonts, with system fonts for monospace text.
- Article cards with short excerpts, topic filters, and fuller previews with key takeaways.
- Keyboard-accessible preview dialogs with focus management and Escape to close.
- Responsive article pages with a table of contents and reading progress.
- Static article links and excerpts remain available when JavaScript is disabled or the post manifest cannot load.

## Run locally

From the repository root:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). Serving the files over HTTP allows the browser to load `posts/posts.json`; opening `index.html` directly from disk may block that request.

## Structure

```text
index.html                 Home page and static post fallback
posts/
  posts.json               Article metadata, excerpts, previews, and cover paths
  _template.html           Starting point for a new article
  *.html                   Published articles
assets/
  css/style.css            Shared design and home page styles
  css/post.css             Article typography and layout
  js/main.js               Theme, post rendering, filtering, and previews
  fonts/                   Local font files and licenses
  images/                  Cover artwork and article illustrations
tokenflow-lab/              Standalone streaming simulator
```

## Add a post

1. Copy `posts/_template.html` to `posts/my-post-slug.html`.
2. Update the title, description, publication date, reading time, article content, and table of contents. Check the cover path relative to the article's `posts/` directory.
3. Add the article to `posts/posts.json`, keeping the newest post first. All manifest paths are relative to the site root:

```json
{
  "title": "A useful title for the article",
  "excerpt": "A short introduction for the article card.",
  "date": "2026-09-30",
  "tag": "LLM Systems",
  "url": "posts/my-post-slug.html",
  "readTime": "5 min read",
  "category": "systems",
  "number": "03",
  "image": "assets/images/my-post-cover.webp",
  "imageAlt": "A concise description of the cover image.",
  "preview": "Two or three sentences explaining the question the article answers and what the reader will learn.",
  "takeaways": [
    "The first concrete idea covered in the article.",
    "A useful comparison or example.",
    "An action the reader can take afterward."
  ]
}
```

4. The `tag` field supplies the topic filter label (for example, `LLM Systems` or `LLM Tools`). Filters are generated automatically from the manifest. Keep the static filter controls in `index.html` in sync as a fallback; `category` is optional metadata.
5. Update the static article fallback in `index.html` to include the same cover, title, metadata, excerpt, and article link. JavaScript refreshes the cards from the manifest, but this fallback keeps every post accessible without JavaScript. Keep any article-count labels in sync.
6. Preview both the home page and article locally, including a narrow screen and both themes. Check the preview button, keyboard navigation, table-of-contents links, and cover text alternatives.
7. Commit and push to the branch configured for GitHub Pages.

Keep preview copy grounded in the article: it should help someone decide what to read without making claims the article does not support. Keep reading times consistent between the manifest, static home page, and article header.

## TokenFlow Lab

The simulator lives in `tokenflow-lab/` with its own HTML, stylesheet, and JavaScript. Open `/tokenflow-lab/` on the local server to use it. It visualizes output token rate and streaming cadence; it does not benchmark inference or simulate prompt prefill.

The related [blog post](posts/tokenflow-lab-llm-streaming-simulator.html) explains its tokenizer profiles, timing modes, and limits. The separate project source is at [nitingururajk/tokenflow-lab](https://github.com/nitingururajk/tokenflow-lab).

## Publish

This repository is served directly by GitHub Pages. In the repository's **Settings → Pages**, select the publishing branch and its root directory. No build tooling is required for the blog.
