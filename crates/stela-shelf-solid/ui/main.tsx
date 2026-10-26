import { render } from "solid-js/web";
import { SearchIsland } from "./SearchIsland";

function initIsland() {
  const el = document.getElementById("search-island");
  if (el) {
    const indexUrl = el.getAttribute("data-index-url") || "/search-index.json";
    render(() => <SearchIsland indexUrl={indexUrl} />, el);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initIsland);
} else {
  initIsland();
}
