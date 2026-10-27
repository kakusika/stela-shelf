import { render } from "solid-js/web";
import "../../stela-shelf-assets/frontend/styles/search-island.css";
import { SearchIsland } from "./SearchIsland";

function initIsland() {
  const el = document.getElementById("search-island");
  if (el && !el.hasChildNodes()) {
    const indexUrl = el.getAttribute("data-index-url") || "/search-index.json";
    render(() => <SearchIsland indexUrl={indexUrl} />, el);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initIsland, { once: true });
} else {
  initIsland();
}
