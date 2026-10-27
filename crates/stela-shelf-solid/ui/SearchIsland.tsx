import { createSignal, createMemo, onMount, onCleanup, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import {
  filterAndRankDocs,
  isEditableElement,
  type SearchDoc,
} from "../../stela-shelf-assets/frontend/scripts/search-island-core";

export function SearchIsland(props: { indexUrl?: string }) {
  const indexUrl = () => props.indexUrl || "/search-index.json";

  const [isOpen, setIsOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [docs, setDocs] = createSignal<SearchDoc[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [loaded, setLoaded] = createSignal(false);

  let inputRef: HTMLInputElement | undefined;

  async function loadIndex() {
    if (loaded()) return;
    try {
      const res = await fetch(indexUrl());
      if (res.ok) {
        const data = (await res.json()) as { docs?: SearchDoc[] };
        setDocs(data.docs ?? []);
        setLoaded(true);
      }
    } catch (e) {
      console.error("Failed to load search index", e);
    }
  }

  function openSearch() {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
    void loadIndex();
    requestAnimationFrame(() => inputRef?.focus());
  }

  function closeSearch() {
    setIsOpen(false);
  }

  const filtered = createMemo(() => filterAndRankDocs(docs(), query(), 10));

  function handleInput(value: string) {
    setQuery(value);
    setSelectedIndex(0);
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (isOpen()) closeSearch();
      else openSearch();
    } else if (
      e.key === "/" &&
      !isOpen() &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !isEditableElement(document.activeElement)
    ) {
      e.preventDefault();
      openSearch();
    } else if (isOpen()) {
      const results = filtered();
      if (e.key === "Escape") {
        e.preventDefault();
        closeSearch();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (results.length > 0) {
          setSelectedIndex((i) => (i + 1) % results.length);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (results.length > 0) {
          setSelectedIndex((i) => (i - 1 + results.length) % results.length);
        }
      } else if (e.key === "Enter" && results[selectedIndex()]) {
        e.preventDefault();
        window.location.href = results[selectedIndex()].url;
      }
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeydown);
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeydown);
  });

  return (
    <div class="island-search-wrapper">
      <button
        type="button"
        class="island-search-trigger"
        onClick={openSearch}
        aria-label="ドキュメントを検索 (⌘K)"
      >
        <span class="island-search-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <span class="island-search-placeholder">Search docs...</span>
        <kbd class="island-search-kbd">⌘K</kbd>
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div class="island-modal-backdrop" onClick={closeSearch}>
            <div
              class="island-modal-box"
              role="dialog"
              tabIndex={-1}
              aria-modal="true"
              aria-label="ドキュメント検索"
              onClick={(e) => e.stopPropagation()}
            >
              <div class="island-modal-header">
                <span class="island-modal-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                    stroke="currentColor"
                    stroke-width="2"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </span>
                <input
                  ref={inputRef}
                  type="search"
                  class="island-modal-input"
                  placeholder="Type to search..."
                  value={query()}
                  onInput={(e) => handleInput(e.currentTarget.value)}
                  autocomplete="off"
                />
                <button type="button" class="island-modal-close" onClick={closeSearch}>
                  Esc
                </button>
              </div>

              <Show
                when={filtered().length > 0}
                fallback={
                  <Show
                    when={query().trim() !== ""}
                    fallback={
                      <div class="island-hint-state">
                        Quick navigation: Type a keyword, use ↑↓ to navigate, Enter to select
                      </div>
                    }
                  >
                    <div class="island-empty-state">No matching documents found</div>
                  </Show>
                }
              >
                <ul class="island-results-list">
                  <For each={filtered()}>
                    {(doc, idx) => (
                      <li>
                        <a
                          href={doc.url}
                          class={`island-result-item ${idx() === selectedIndex() ? "selected" : ""}`}
                          onMouseEnter={() => setSelectedIndex(idx())}
                        >
                          <div class="island-result-header">
                            <span class="island-result-title">{doc.title}</span>
                            <Show when={doc.section}>
                              <span class="island-result-section">{doc.section}</span>
                            </Show>
                          </div>
                          <Show when={doc.headings && doc.headings.length > 0}>
                            <div class="island-result-sub">{doc.headings!.slice(0, 3).join(" · ")}</div>
                          </Show>
                        </a>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  );
}
