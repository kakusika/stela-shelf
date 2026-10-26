<script lang="ts">
  import { onMount } from "svelte";

  interface SearchDoc {
    id: number;
    title: string;
    url: string;
    headings?: string[];
    text?: string;
  }

  let { indexUrl = "/search-index.json" }: { indexUrl?: string } = $props();

  let isOpen = $state(false);
  let query = $state("");
  let docs = $state<SearchDoc[]>([]);
  let selectedIndex = $state(0);
  let loaded = $state(false);
  let inputEl = $state<HTMLInputElement | null>(null);

  async function loadIndex() {
    if (loaded) return;
    try {
      const res = await fetch(indexUrl);
      if (res.ok) {
        const data = await res.json();
        docs = data.docs || [];
        loaded = true;
      }
    } catch (e) {
      console.error("Failed to load search index", e);
    }
  }

  function openSearch() {
    isOpen = true;
    query = "";
    selectedIndex = 0;
    loadIndex();
    setTimeout(() => inputEl?.focus(), 50);
  }

  function closeSearch() {
    isOpen = false;
  }

  let filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return docs
      .filter((d) => {
        const titleMatch = d.title.toLowerCase().includes(q);
        const headingMatch = d.headings && d.headings.some((h) => h.toLowerCase().includes(q));
        const textMatch = d.text && d.text.toLowerCase().includes(q);
        return titleMatch || headingMatch || textMatch;
      })
      .slice(0, 8);
  });

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      if (isOpen) closeSearch();
      else openSearch();
    } else if (
      e.key === "/" &&
      !isOpen &&
      document.activeElement?.tagName !== "INPUT" &&
      document.activeElement?.tagName !== "TEXTAREA"
    ) {
      e.preventDefault();
      openSearch();
    } else if (isOpen) {
      if (e.key === "Escape") {
        closeSearch();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filtered.length > 0) {
          selectedIndex = (selectedIndex + 1) % filtered.length;
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filtered.length > 0) {
          selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
        }
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        window.location.href = filtered[selectedIndex].url;
      }
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  });
</script>

<div class="island-search-wrapper">
  <!-- Trigger button styled like a native input -->
  <button type="button" class="island-search-trigger" onclick={openSearch}>
    <span class="island-search-icon">🔍</span>
    <span class="island-search-placeholder">Search docs...</span>
    <kbd class="island-search-kbd">⌘K</kbd>
  </button>

  {#if isOpen}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="island-modal-backdrop" onclick={closeSearch}>
      <!-- Modal Box -->
      <div class="island-modal-box" onclick={(e) => e.stopPropagation()}>
        <div class="island-modal-header">
          <span class="island-modal-icon">🔍</span>
          <input
            bind:this={inputEl}
            type="search"
            class="island-modal-input"
            placeholder="Type to search..."
            bind:value={query}
            autocomplete="off"
          />
          <button type="button" class="island-modal-close" onclick={closeSearch}>Esc</button>
        </div>

        {#if filtered.length > 0}
          <ul class="island-results-list">
            {#each filtered as doc, idx}
              <li>
                <a
                  href={doc.url}
                  class="island-result-item {idx === selectedIndex ? 'selected' : ''}"
                  onmouseenter={() => (selectedIndex = idx)}
                >
                  <div class="island-result-title">{doc.title}</div>
                  {#if doc.headings && doc.headings.length > 0}
                    <div class="island-result-sub">{doc.headings.slice(0, 3).join(" · ")}</div>
                  {/if}
                </a>
              </li>
            {/each}
          </ul>
        {:else if query.trim() !== ""}
          <div class="island-empty-state">No matching documents found</div>
        {:else}
          <div class="island-hint-state">Quick navigation: Type a keyword, use ↑↓ to navigate, Enter to select</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .island-search-wrapper {
    width: 100%;
    margin-bottom: 1.5rem;
  }

  .island-search-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    font-family: inherit;
    background-color: var(--bg-surface, #ffffff);
    color: var(--text-muted, #79736c);
    border: 1px solid var(--border-color, #e2ddd4);
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
  }

  .island-search-trigger:hover {
    border-color: var(--text-accent, #0284c7);
    color: var(--text-primary, #262321);
  }

  .island-search-icon {
    font-size: 0.9rem;
    opacity: 0.75;
  }

  .island-search-placeholder {
    flex: 1;
  }

  .island-search-kbd {
    font-size: 0.7rem;
    font-family: var(--font-mono, monospace);
    background-color: var(--bg-subtle, #eeeae1);
    color: var(--text-secondary, #57524d);
    border: 1px solid var(--border-color, #e2ddd4);
    border-radius: 4px;
    padding: 0.1rem 0.35rem;
    font-weight: 600;
  }

  /* Modal Styles */
  .island-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(2px);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 12vh;
  }

  .island-modal-box {
    width: 90%;
    max-width: 600px;
    background-color: var(--bg-surface, #ffffff);
    color: var(--text-primary, #262321);
    border: 1px solid var(--border-color, #e2ddd4);
    border-radius: 10px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    overflow: hidden;
  }

  .island-modal-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--border-color, #e2ddd4);
  }

  .island-modal-icon {
    font-size: 1.1rem;
    opacity: 0.6;
  }

  .island-modal-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 1.05rem;
    font-family: inherit;
    color: var(--text-primary, #262321);
  }

  .island-modal-close {
    font-size: 0.75rem;
    font-family: var(--font-mono, monospace);
    background-color: var(--bg-subtle, #eeeae1);
    border: 1px solid var(--border-color, #e2ddd4);
    color: var(--text-secondary, #57524d);
    padding: 0.2rem 0.45rem;
    border-radius: 4px;
    cursor: pointer;
  }

  .island-results-list {
    list-style: none;
    margin: 0;
    padding: 0.5rem;
    max-height: 380px;
    overflow-y: auto;
  }

  .island-result-item {
    display: block;
    padding: 0.6rem 0.85rem;
    text-decoration: none;
    border-radius: 6px;
    color: var(--text-primary, #262321);
    transition: all 0.12s ease;
  }

  .island-result-item:hover,
  .island-result-item.selected {
    background-color: var(--accent-soft, #e0f2fe);
    color: var(--text-accent, #0284c7);
  }

  .island-result-title {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .island-result-sub {
    font-size: 0.8rem;
    color: var(--text-muted, #79736c);
    margin-top: 0.2rem;
  }

  .island-empty-state,
  .island-hint-state {
    padding: 2.5rem 1.5rem;
    text-align: center;
    font-size: 0.9rem;
    color: var(--text-muted, #79736c);
  }
</style>
