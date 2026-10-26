import { createSignal, createMemo, onMount, onCleanup, For, Show } from "solid-js";

interface SearchDoc {
  id: number;
  title: string;
  url: string;
  headings?: string[];
  text?: string;
}

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
        const data = await res.json();
        setDocs(data.docs || []);
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
    loadIndex();
    setTimeout(() => inputRef?.focus(), 50);
  }

  function closeSearch() {
    setIsOpen(false);
  }

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    if (!q) return [];
    return docs()
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
      if (isOpen()) closeSearch();
      else openSearch();
    } else if (
      e.key === "/" &&
      !isOpen() &&
      document.activeElement?.tagName !== "INPUT" &&
      document.activeElement?.tagName !== "TEXTAREA"
    ) {
      e.preventDefault();
      openSearch();
    } else if (isOpen()) {
      const results = filtered();
      if (e.key === "Escape") {
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
      <button type="button" class="island-search-trigger" onClick={openSearch}>
        <span class="island-search-icon">🔍</span>
        <span class="island-search-placeholder">Search docs...</span>
        <kbd class="island-search-kbd">⌘K</kbd>
      </button>

      <Show when={isOpen()}>
        <div class="island-modal-backdrop" onClick={closeSearch}>
          <div class="island-modal-box" onClick={(e) => e.stopPropagation()}>
            <div class="island-modal-header">
              <span class="island-modal-icon">🔍</span>
              <input
                ref={inputRef}
                type="search"
                class="island-modal-input"
                placeholder="Type to search..."
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
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
                        <div class="island-result-title">{doc.title}</div>
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
      </Show>
    </div>
  );
}
