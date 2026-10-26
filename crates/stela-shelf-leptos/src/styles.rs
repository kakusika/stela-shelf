/// Stone & Stela inspired modern stylesheet for stela-shelf-leptos.
pub const LEPTOS_SHELF_CSS: &str = r#"
:root {
  --bg-primary: #fdfbf7;
  --bg-surface: #ffffff;
  --bg-sidebar: #f7f5f0;
  --bg-subtle: #f0ede6;
  --border-color: #e5e0d8;
  --border-light: #eeeae3;
  --text-primary: #292524;
  --text-secondary: #57534e;
  --text-muted: #78716c;
  --text-accent: #b45309;
  --accent-soft: #fef3c7;
  --accent-border: #fde68a;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --sidebar-width: 260px;
  --toc-width: 240px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #141210;
    --bg-surface: #1c1a17;
    --bg-sidebar: #181614;
    --bg-subtle: #24211e;
    --border-color: #2e2a25;
    --border-light: #26221d;
    --text-primary: #f5f5f4;
    --text-secondary: #d6d3d1;
    --text-muted: #a8a29e;
    --text-accent: #f59e0b;
    --accent-soft: #451a03;
    --accent-border: #78350f;
  }
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  min-height: 100vh;
  font-family: var(--font-sans);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

/* Three-pane layout */
.shelf-container {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

/* Sidebar */
.shelf-sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  padding: 2rem 1.25rem;
  overflow-y: auto;
  position: sticky;
  top: 0;
  height: 100vh;
}

.shelf-header {
  margin-bottom: 2rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.shelf-title {
  display: block;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  text-decoration: none;
  letter-spacing: -0.01em;
}

.shelf-title:hover {
  color: var(--text-accent);
}

.shelf-engine-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background-color: var(--accent-soft);
  color: var(--text-accent);
  border: 1px solid var(--accent-border);
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  margin-top: 0.5rem;
}

.shelf-nav-list {
  list-style: none;
}

.shelf-nav-item {
  margin-bottom: 0.25rem;
}

.shelf-nav-link {
  display: block;
  padding: 0.45rem 0.65rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.88rem;
  transition: all 0.15s ease;
}

.shelf-nav-link:hover {
  background-color: var(--bg-subtle);
  color: var(--text-primary);
}

.shelf-nav-link.active {
  background-color: var(--bg-surface);
  color: var(--text-accent);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* Main Content Area */
.shelf-main {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
  padding: 3.5rem 2.5rem;
  background-color: var(--bg-surface);
}

.shelf-article {
  width: 100%;
  max-width: 760px;
}

.shelf-article-title {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.25;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.shelf-hero-chips {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.shelf-chip {
  font-size: 0.78rem;
  padding: 0.25rem 0.65rem;
  background-color: var(--bg-subtle);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
}

/* Prose & Typography (Tomet rendered Markdown) */
.shelf-prose {
  font-size: 1.05rem;
  color: var(--text-primary);
  line-height: 1.75;
}

.shelf-prose h1,
.shelf-prose h2,
.shelf-prose h3,
.shelf-prose h4 {
  color: var(--text-primary);
  font-weight: 700;
  line-height: 1.35;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}

.shelf-prose h1 {
  font-size: 1.75rem;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 0.5rem;
}

.shelf-prose h2 {
  font-size: 1.4rem;
}

.shelf-prose h3 {
  font-size: 1.15rem;
}

.shelf-prose p {
  margin-bottom: 1.35rem;
}

.shelf-prose ul,
.shelf-prose ol {
  margin-bottom: 1.35rem;
  padding-left: 1.75rem;
}

.shelf-prose li {
  margin-bottom: 0.4rem;
}

.shelf-prose li > ul,
.shelf-prose li > ol {
  margin-top: 0.4rem;
  margin-bottom: 0.4rem;
}

.shelf-prose a {
  color: var(--text-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
  transition: opacity 0.15s ease;
}

.shelf-prose a:hover {
  opacity: 0.8;
}

.shelf-prose strong {
  font-weight: 700;
}

.shelf-prose em {
  font-style: italic;
}

.shelf-prose blockquote {
  border-left: 3px solid var(--text-accent);
  padding-left: 1rem;
  margin: 1.5rem 0;
  color: var(--text-secondary);
  font-style: italic;
}

.shelf-prose code {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background-color: var(--bg-subtle);
  border: 1px solid var(--border-color);
  padding: 0.15em 0.35em;
  border-radius: 4px;
}

.shelf-prose pre {
  background-color: var(--bg-sidebar);
  border: 1px solid var(--border-color);
  padding: 1.25rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5rem 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.shelf-prose pre code {
  background: none;
  border: none;
  padding: 0;
}

/* Heading number styling */
.tm-heading-number {
  font-weight: 600;
  color: var(--text-accent);
  margin-right: 0.5rem;
  opacity: 0.85;
}

/* Table of Contents (Right pane) */
.shelf-toc {
  width: var(--toc-width);
  min-width: var(--toc-width);
  padding: 3.5rem 1.5rem 2rem 1.5rem;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  border-left: 1px solid var(--border-light);
}

.shelf-toc-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.shelf-toc-list {
  list-style: none;
}

.shelf-toc-item {
  margin-bottom: 0.35rem;
}

.shelf-toc-link {
  display: block;
  font-size: 0.84rem;
  color: var(--text-muted);
  text-decoration: none;
  line-height: 1.4;
  padding: 0.2rem 0;
  transition: color 0.15s ease;
}

.shelf-toc-link:hover {
  color: var(--text-primary);
}

/* Backlinks Section */
.shelf-backlinks {
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.shelf-backlinks-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

/* Responsive Breakpoints */
@media (max-width: 1200px) {
  .shelf-toc {
    display: none;
  }
}

@media (max-width: 820px) {
  .shelf-container {
    flex-direction: column;
  }
  .shelf-sidebar {
    width: 100%;
    min-width: 100%;
    height: auto;
    position: static;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    padding: 1.5rem 1rem;
  }
  .shelf-main {
    padding: 2rem 1rem;
  }
}
"#;
