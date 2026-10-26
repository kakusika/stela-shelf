import { mount } from "svelte";
import SearchIsland from "./SearchIsland.svelte";

function initIsland() {
  const el = document.getElementById("search-island");
  if (el) {
    const indexUrl = el.getAttribute("data-index-url") || "/search-index.json";
    mount(SearchIsland, {
      target: el,
      props: { indexUrl },
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initIsland);
} else {
  initIsland();
}
