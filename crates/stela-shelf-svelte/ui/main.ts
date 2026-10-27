import { mount } from "svelte";
import "../../stela-shelf-assets/frontend/styles/search-island.css";
import SearchIsland from "./SearchIsland.svelte";

function initIsland() {
  const el = document.getElementById("search-island");
  if (el && !el.hasChildNodes()) {
    const indexUrl = el.getAttribute("data-index-url") || "/search-index.json";
    mount(SearchIsland, {
      target: el,
      props: { indexUrl },
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initIsland, { once: true });
} else {
  initIsland();
}
