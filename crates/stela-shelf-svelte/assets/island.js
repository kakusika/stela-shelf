var l, r;
const o = (r = (l = globalThis.process) == null ? void 0 : l.env) == null ? void 0 : r.NODE_ENV, a = o && !o.toLowerCase().startsWith("prod");
function c(e) {
  const t = new Error(`lifecycle_function_unavailable
\`${e}(...)\` is not available on the server
https://svelte.dev/e/lifecycle_function_unavailable`);
  throw t.name = "Svelte error", t;
}
function u(e) {
  if (a) {
    const t = new Error(`rune_outside_svelte
The \`${e}\` rune is only available inside \`.svelte\` and \`.svelte.js/ts\` files
https://svelte.dev/e/rune_outside_svelte`);
    throw t.name = "Svelte error", t;
  } else
    throw new Error("https://svelte.dev/e/rune_outside_svelte");
}
function f() {
  c("mount");
}
const v = "5";
var s;
typeof window < "u" && ((s = window.__svelte ?? (window.__svelte = {})).v ?? (s.v = /* @__PURE__ */ new Set())).add(v);
const _ = /* @__PURE__ */ new Set(), h = /* @__PURE__ */ new Set();
function w(e) {
  for (var t = 0; t < e.length; t++)
    _.add(e[t]);
  for (var n of h)
    n(e);
}
if (a) {
  let e = function(t) {
    if (!(t in globalThis)) {
      let n;
      Object.defineProperty(globalThis, t, {
        configurable: !0,
        // eslint-disable-next-line getter-return
        get: () => {
          if (n !== void 0)
            return n;
          u(t);
        },
        set: (d) => {
          n = d;
        }
      });
    }
  };
  var b = e;
  e("$state"), e("$effect"), e("$derived"), e("$inspect"), e("$props"), e("$bindable");
}
w(["click"]);
function i() {
  const e = document.getElementById("search-island");
  e && (e.getAttribute("data-index-url"), f());
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i) : i();
