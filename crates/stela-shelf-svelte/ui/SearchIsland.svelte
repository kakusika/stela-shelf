<script lang="ts">
  import { onMount } from "svelte";
  import {
    filterAndRankDocs,
    isEditableElement,
    type SearchDoc,
  } from "../../stela-shelf-assets/frontend/scripts/search-island-core";

  let { indexUrl = "/search-index.json" }: { indexUrl?: string } = $props();

  let isOpen = $state(false);
  let query = $state("");
  let docs = $state<SearchDoc[]>([]);
  let selectedIndex = $state(0);
  let loaded = $state(false);
  let inputEl = $state<HTMLInputElement | null>(null);

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }

  async function loadIndex() {
    if (loaded) return;
    try {
      const res = await fetch(indexUrl);
      if (res.ok) {
        const data = (await res.json()) as { docs?: SearchDoc[] };
        docs = data.docs ?? [];
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
    void loadIndex();
    requestAnimationFrame(() => inputEl?.focus());
  }

  function closeSearch() {
    isOpen = false;
  }

  let filtered = $derived(filterAndRankDocs(docs, query, 10));

  function handleInput(e: Event) {
    query = (e.currentTarget as HTMLInputElement).value;
    selectedIndex = 0;
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (isOpen) closeSearch();
      else openSearch();
    } else if (
      e.key === "/" &&
      !isOpen &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !isEditableElement(document.activeElement)
    ) {
      e.preventDefault();
      openSearch();
    } else if (isOpen) {
      if (e.key === "Escape") {
        e.preventDefault();
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
  <button type="button" class="island-search-trigger" onclick={openSearch} aria-label="ドキュメントを検索 (⌘K)">
    <span class="island-search-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.3-4.3"></path>
      </svg>
    </span>
    <span class="island-search-placeholder">Search docs...</span>
    <kbd class="island-search-kbd">⌘K</kbd>
  </button>

  {#if isOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="island-modal-backdrop" use:portal onclick={closeSearch}>
      <div class="island-modal-box" role="dialog" tabindex="-1" aria-modal="true" aria-label="ドキュメント検索" onclick={(e) => e.stopPropagation()}>
        <div class="island-modal-header">
          <span class="island-modal-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
          </span>
          <input
            bind:this={inputEl}
            type="search"
            class="island-modal-input"
            placeholder="Type to search..."
            value={query}
            oninput={handleInput}
            autocomplete="off"
          />
          <button type="button" class="island-modal-close" onclick={closeSearch}>Esc</button>
        </div>

        {#if filtered.length > 0}
          <ul class="island-results-list">
            {#each filtered as doc, idx (doc.id)}
              <li>
                <a
                  href={doc.url}
                  class="island-result-item {idx === selectedIndex ? 'selected' : ''}"
                  onmouseenter={() => (selectedIndex = idx)}
                >
                  <div class="island-result-header">
                    <span class="island-result-title">{doc.title}</span>
                    {#if doc.section}
                      <span class="island-result-section">{doc.section}</span>
                    {/if}
                  </div>
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
