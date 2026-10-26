const Ae = (e, t) => e === t, Ee = Symbol("solid-track"), Q = {
  equals: Ae
};
let ae = we;
const T = 1, H = 2, de = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null
};
var w = null;
let z = null, Se = null, p = null, m = null, $ = null, Y = 0;
function G(e, t) {
  const n = p, s = w, l = e.length === 0, r = t === void 0 ? s : t, o = l ? de : {
    owned: null,
    cleanups: null,
    context: r ? r.context : null,
    owner: r
  }, i = l ? e : () => e(() => k(() => V(o)));
  w = o, p = null;
  try {
    return F(i, !0);
  } finally {
    p = n, w = s;
  }
}
function O(e, t) {
  t = t ? Object.assign({}, Q, t) : Q;
  const n = {
    value: e,
    observers: null,
    observerSlots: null,
    comparator: t.equals || void 0
  }, s = (l) => (typeof l == "function" && (l = l(n.value)), ge(n, l));
  return [pe.bind(n), s];
}
function K(e, t, n) {
  const s = te(e, t, !1, T);
  q(s);
}
function $e(e, t, n) {
  ae = Te;
  const s = te(e, t, !1, T);
  s.user = !0, $ ? $.push(s) : q(s);
}
function M(e, t, n) {
  n = n ? Object.assign({}, Q, n) : Q;
  const s = te(e, t, !0, 0);
  return s.observers = null, s.observerSlots = null, s.comparator = n.equals || void 0, q(s), pe.bind(s);
}
function k(e) {
  if (p === null) return e();
  const t = p;
  p = null;
  try {
    return e();
  } finally {
    p = t;
  }
}
function xe(e) {
  $e(() => k(e));
}
function he(e) {
  return w === null || (w.cleanups === null ? w.cleanups = [e] : w.cleanups.push(e)), e;
}
function pe() {
  if (this.sources && this.state)
    if (this.state === T) q(this);
    else {
      const e = m;
      m = null, F(() => W(this), !1), m = e;
    }
  if (p) {
    const e = this.observers;
    if (!e || e[e.length - 1] !== p) {
      const t = e ? e.length : 0;
      p.sources ? (p.sources.push(this), p.sourceSlots.push(t)) : (p.sources = [this], p.sourceSlots = [t]), e ? (e.push(p), this.observerSlots.push(p.sources.length - 1)) : (this.observers = [p], this.observerSlots = [p.sources.length - 1]);
    }
  }
  return this.value;
}
function ge(e, t, n) {
  let s = e.value;
  return (!e.comparator || !e.comparator(s, t)) && (e.value = t, e.observers && e.observers.length && F(() => {
    for (let l = 0; l < e.observers.length; l += 1) {
      const r = e.observers[l], o = z && z.running;
      o && z.disposed.has(r), (o ? !r.tState : !r.state) && (r.pure ? m.push(r) : $.push(r), r.observers && ye(r)), o || (r.state = T);
    }
    if (m.length > 1e6)
      throw m = [], new Error();
  }, !1)), t;
}
function q(e) {
  if (!e.fn) return;
  V(e);
  const t = Y;
  Ce(e, e.value, t);
}
function Ce(e, t, n) {
  let s;
  const l = w, r = p;
  p = w = e;
  try {
    s = e.fn(t);
  } catch (o) {
    return e.pure && (e.state = T, e.owned && e.owned.forEach(V), e.owned = null), e.updatedAt = n + 1, me(o);
  } finally {
    p = r, w = l;
  }
  (!e.updatedAt || e.updatedAt <= n) && (e.updatedAt != null && "observers" in e ? ge(e, s) : e.value = s, e.updatedAt = n);
}
function te(e, t, n, s = T, l) {
  const r = {
    fn: e,
    state: s,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: t,
    owner: w,
    context: w ? w.context : null,
    pure: n
  };
  return w === null || w !== de && (w.owned ? w.owned.push(r) : w.owned = [r]), r;
}
function X(e) {
  if (e.state === 0) return;
  if (e.state === H) return W(e);
  if (e.suspense && k(e.suspense.inFallback)) return e.suspense.effects.push(e);
  const t = [e];
  for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < Y); )
    e.state && t.push(e);
  for (let n = t.length - 1; n >= 0; n--)
    if (e = t[n], e.state === T)
      q(e);
    else if (e.state === H) {
      const s = m;
      m = null, F(() => W(e, t[0]), !1), m = s;
    }
}
function F(e, t) {
  if (m) return e();
  let n = !1;
  t || (m = []), $ ? n = !0 : $ = [], Y++;
  try {
    const s = e();
    return ke(n), s;
  } catch (s) {
    n || ($ = null), m = null, me(s);
  }
}
function ke(e) {
  if (m && (we(m), m = null), e) return;
  const t = $;
  $ = null, t.length && F(() => ae(t), !1);
}
function we(e) {
  for (let t = 0; t < e.length; t++) X(e[t]);
}
function Te(e) {
  let t, n = 0;
  for (t = 0; t < e.length; t++) {
    const s = e[t];
    s.user ? e[n++] = s : X(s);
  }
  for (t = 0; t < n; t++) X(e[t]);
}
function W(e, t) {
  e.state = 0;
  for (let n = 0; n < e.sources.length; n += 1) {
    const s = e.sources[n];
    if (s.sources) {
      const l = s.state;
      l === T ? s !== t && (!s.updatedAt || s.updatedAt < Y) && X(s) : l === H && W(s, t);
    }
  }
}
function ye(e) {
  for (let t = 0; t < e.observers.length; t += 1) {
    const n = e.observers[t];
    n.state || (n.state = H, n.pure ? m.push(n) : $.push(n), n.observers && ye(n));
  }
}
function V(e) {
  let t;
  if (e.sources)
    for (; e.sources.length; ) {
      const n = e.sources.pop(), s = e.sourceSlots.pop(), l = n.observers;
      if (l && l.length) {
        const r = l.pop(), o = n.observerSlots.pop();
        s < l.length && (r.sourceSlots[o] = s, l[s] = r, n.observerSlots[s] = o);
      }
    }
  if (e.tOwned) {
    for (t = e.tOwned.length - 1; t >= 0; t--) V(e.tOwned[t]);
    delete e.tOwned;
  }
  if (e.owned) {
    for (t = e.owned.length - 1; t >= 0; t--) V(e.owned[t]);
    e.owned = null;
  }
  if (e.cleanups) {
    for (t = e.cleanups.length - 1; t >= 0; t--) e.cleanups[t]();
    e.cleanups = null;
  }
  e.state = 0;
}
function _e(e) {
  return e instanceof Error ? e : new Error(typeof e == "string" ? e : "Unknown error", {
    cause: e
  });
}
function me(e, t = w) {
  throw _e(e);
}
const Le = Symbol("fallback");
function oe(e) {
  for (let t = 0; t < e.length; t++) e[t]();
}
function Ne(e, t, n = {}) {
  let s = [], l = [], r = [], o = 0, i = t.length > 1 ? [] : null;
  return he(() => oe(r)), () => {
    let f = e() || [], a = f.length, d, c;
    return f[Ee], k(() => {
      let v, E, A, x, _, u, h, y, g;
      if (a === 0)
        o !== 0 && (oe(r), r = [], s = [], l = [], o = 0, i && (i = [])), n.fallback && (s = [Le], l[0] = G((S) => (r[0] = S, n.fallback())), o = 1);
      else if (o === 0) {
        for (l = new Array(a), c = 0; c < a; c++)
          s[c] = f[c], l[c] = G(b);
        o = a;
      } else {
        for (A = new Array(a), x = new Array(a), i && (_ = new Array(a)), u = 0, h = Math.min(o, a); u < h && s[u] === f[u]; u++) ;
        for (h = o - 1, y = a - 1; h >= u && y >= u && s[h] === f[y]; h--, y--)
          A[y] = l[h], x[y] = r[h], i && (_[y] = i[h]);
        for (v = /* @__PURE__ */ new Map(), E = new Array(y + 1), c = y; c >= u; c--)
          g = f[c], d = v.get(g), E[c] = d === void 0 ? -1 : d, v.set(g, c);
        for (d = u; d <= h; d++)
          g = s[d], c = v.get(g), c !== void 0 && c !== -1 ? (A[c] = l[d], x[c] = r[d], i && (_[c] = i[d]), c = E[c], v.set(g, c)) : r[d]();
        for (c = u; c < a; c++)
          c in A ? (l[c] = A[c], r[c] = x[c], i && (i[c] = _[c], i[c](c))) : l[c] = G(b);
        l = l.slice(0, o = a), s = f.slice(0);
      }
      return l;
    });
    function b(v) {
      if (r[c] = v, i) {
        const [E, A] = O(c);
        return i[c] = A, t(f[c], E);
      }
      return t(f[c]);
    }
  };
}
function U(e, t) {
  return k(() => e(t || {}));
}
const Ie = (e) => `Stale read from <${e}>.`;
function De(e) {
  const t = "fallback" in e && {
    fallback: () => e.fallback
  };
  return M(Ne(() => e.each, e.children, t || void 0));
}
function R(e) {
  const t = e.keyed, n = M(() => e.when, void 0, void 0), s = t ? n : M(n, void 0, {
    equals: (l, r) => !l == !r
  });
  return M(() => {
    const l = s();
    if (l) {
      const r = e.children;
      return typeof r == "function" && r.length > 0 ? k(() => r(t ? l : () => {
        if (!k(s)) throw Ie("Show");
        return n();
      })) : r;
    }
    return e.fallback;
  }, void 0, void 0);
}
const Oe = (e) => M(() => e());
function Ue(e, t, n) {
  let s = n.length, l = t.length, r = s, o = 0, i = 0, f = t[l - 1].nextSibling, a = null;
  for (; o < l || i < r; ) {
    if (t[o] === n[i]) {
      o++, i++;
      continue;
    }
    for (; t[l - 1] === n[r - 1]; )
      l--, r--;
    if (l === o) {
      const d = r < s ? i ? n[i - 1].nextSibling : n[r - i] : f;
      for (; i < r; ) e.insertBefore(n[i++], d);
    } else if (r === i)
      for (; o < l; )
        (!a || !a.has(t[o])) && t[o].remove(), o++;
    else if (t[o] === n[r - 1] && n[i] === t[l - 1]) {
      const d = t[--l].nextSibling;
      e.insertBefore(n[i++], t[o++].nextSibling), e.insertBefore(n[--r], d), t[l] = n[r];
    } else {
      if (!a) {
        a = /* @__PURE__ */ new Map();
        let c = i;
        for (; c < r; ) a.set(n[c], c++);
      }
      const d = a.get(t[o]);
      if (d != null)
        if (i < d && d < r) {
          let c = o, b = 1, v;
          for (; ++c < l && c < r && !((v = a.get(t[c])) == null || v !== d + b); )
            b++;
          if (b > d - i) {
            const E = t[o];
            for (; i < d; ) e.insertBefore(n[i++], E);
          } else e.replaceChild(n[i++], t[o++]);
        } else o++;
      else t[o++].remove();
    }
  }
}
const ce = "_$DX_DELEGATE";
function Me(e, t, n, s = {}) {
  let l;
  return G((r) => {
    l = r, t === document ? e() : L(t, e(), t.firstChild ? null : void 0, n);
  }, s.owner), () => {
    l(), t.textContent = "";
  };
}
function N(e, t, n, s) {
  let l;
  const r = () => {
    const i = document.createElement("template");
    return i.innerHTML = e, i.content.firstChild;
  }, o = () => (l || (l = r())).cloneNode(!0);
  return o.cloneNode = o, o;
}
function je(e, t = window.document) {
  const n = t[ce] || (t[ce] = /* @__PURE__ */ new Set());
  for (let s = 0, l = e.length; s < l; s++) {
    const r = e[s];
    n.has(r) || (n.add(r), t.addEventListener(r, Ve));
  }
}
function Be(e, t, n) {
  n == null ? e.removeAttribute(t) : e.setAttribute(t, n);
}
function Pe(e, t) {
  t == null ? e.removeAttribute("class") : e.className = t;
}
function Ke(e, t, n) {
  return k(() => e(t, n));
}
function L(e, t, n, s) {
  if (n !== void 0 && !s && (s = []), typeof t != "function") return J(e, t, s, n);
  K((l) => J(e, t(), l, n), s);
}
function Ve(e) {
  let t = e.target;
  const n = `$$${e.type}`, s = e.target, l = e.currentTarget, r = (f) => Object.defineProperty(e, "target", {
    configurable: !0,
    value: f
  }), o = () => {
    const f = t[n];
    if (f && !t.disabled) {
      const a = t[`${n}Data`];
      if (a !== void 0 ? f.call(t, a, e) : f.call(t, e), e.cancelBubble) return;
    }
    return t.host && typeof t.host != "string" && !t.host._$host && t.contains(e.target) && r(t.host), !0;
  }, i = () => {
    for (; o() && (t = t._$host || t.parentNode || t.host); ) ;
  };
  Object.defineProperty(e, "currentTarget", {
    configurable: !0,
    get() {
      return t || document;
    }
  });
  try {
    if (e.composedPath) {
      const f = e.composedPath();
      r(f[0]);
      for (let a = 0; a < f.length - 2 && (t = f[a], !!o()); a++) {
        if (t._$host) {
          t = t._$host, i();
          break;
        }
        if (t.parentNode === l)
          break;
      }
    } else i();
    r(s);
  } finally {
    e = t = null;
  }
}
function J(e, t, n, s, l) {
  for (; typeof n == "function"; ) n = n();
  if (t === n) return n;
  const r = typeof t, o = s !== void 0;
  if (e = o && n[0] && n[0].parentNode || e, r === "string" || r === "number") {
    if (r === "number" && (t = t.toString(), t === n))
      return n;
    if (o) {
      let i = n[0];
      i && i.nodeType === 3 ? i.data !== t && (i.data = t) : i = document.createTextNode(t), n = D(e, n, s, i);
    } else
      n !== "" && typeof n == "string" ? n = e.firstChild.data = t : n = e.textContent = t;
  } else if (t == null || r === "boolean")
    n = D(e, n, s);
  else {
    if (r === "function")
      return K(() => {
        let i = t();
        for (; typeof i == "function"; ) i = i();
        n = J(e, i, n, s);
      }), () => n;
    if (Array.isArray(t)) {
      const i = [], f = n && Array.isArray(n);
      if (ee(i, t, n, l))
        return K(() => n = J(e, i, n, s, !0)), () => n;
      if (i.length === 0) {
        if (n = D(e, n, s), o) return n;
      } else f ? n.length === 0 ? fe(e, i, s) : Ue(e, n, i) : (n && D(e), fe(e, i));
      n = i;
    } else if (t.nodeType) {
      if (Array.isArray(n)) {
        if (o) return n = D(e, n, s, t);
        D(e, n, null, t);
      } else n == null || n === "" || !e.firstChild ? e.appendChild(t) : e.replaceChild(t, e.firstChild);
      n = t;
    }
  }
  return n;
}
function ee(e, t, n, s) {
  let l = !1;
  for (let r = 0, o = t.length; r < o; r++) {
    let i = t[r], f = n && n[e.length], a;
    if (!(i == null || i === !0 || i === !1)) if ((a = typeof i) == "object" && i.nodeType)
      e.push(i);
    else if (Array.isArray(i))
      l = ee(e, i, f) || l;
    else if (a === "function")
      if (s) {
        for (; typeof i == "function"; ) i = i();
        l = ee(e, Array.isArray(i) ? i : [i], Array.isArray(f) ? f : [f]) || l;
      } else
        e.push(i), l = !0;
    else {
      const d = String(i);
      f && f.nodeType === 3 && f.data === d ? e.push(f) : e.push(document.createTextNode(d));
    }
  }
  return l;
}
function fe(e, t, n = null) {
  for (let s = 0, l = t.length; s < l; s++) e.insertBefore(t[s], n);
}
function D(e, t, n, s) {
  if (n === void 0) return e.textContent = "";
  const l = s || document.createTextNode("");
  if (t.length) {
    let r = !1;
    for (let o = t.length - 1; o >= 0; o--) {
      const i = t[o];
      if (l !== i) {
        const f = i.parentNode === e;
        !r && !o ? f ? e.replaceChild(l, i) : e.insertBefore(l, n) : f && i.remove();
      } else r = !0;
    }
  } else e.insertBefore(l, n);
  return [l];
}
var qe = /* @__PURE__ */ N("<ul class=island-results-list>"), Fe = /* @__PURE__ */ N('<div class=island-modal-backdrop><div class=island-modal-box><div class=island-modal-header><span class=island-modal-icon>🔍</span><input type=search class=island-modal-input placeholder="Type to search..."autocomplete=off><button type=button class=island-modal-close>Esc'), Re = /* @__PURE__ */ N("<div class=island-search-wrapper><button type=button class=island-search-trigger><span class=island-search-icon>🔍</span><span class=island-search-placeholder>Search docs...</span><kbd class=island-search-kbd>⌘K"), Ge = /* @__PURE__ */ N("<div class=island-empty-state>No matching documents found"), Qe = /* @__PURE__ */ N("<div class=island-hint-state>Quick navigation: Type a keyword, use ↑↓ to navigate, Enter to select"), He = /* @__PURE__ */ N("<div class=island-result-sub>"), Xe = /* @__PURE__ */ N("<li><a><div class=island-result-title>");
function We(e) {
  const t = () => e.indexUrl || "/search-index.json", [n, s] = O(!1), [l, r] = O(""), [o, i] = O([]), [f, a] = O(0), [d, c] = O(!1);
  let b;
  async function v() {
    if (!d())
      try {
        const u = await fetch(t());
        if (u.ok) {
          const h = await u.json();
          i(h.docs || []), c(!0);
        }
      } catch (u) {
        console.error("Failed to load search index", u);
      }
  }
  function E() {
    s(!0), r(""), a(0), v(), setTimeout(() => b == null ? void 0 : b.focus(), 50);
  }
  function A() {
    s(!1);
  }
  const x = M(() => {
    const u = l().trim().toLowerCase();
    return u ? o().filter((h) => {
      const y = h.title.toLowerCase().includes(u), g = h.headings && h.headings.some((Z) => Z.toLowerCase().includes(u)), S = h.text && h.text.toLowerCase().includes(u);
      return y || g || S;
    }).slice(0, 8) : [];
  });
  function _(u) {
    var h, y;
    if ((u.metaKey || u.ctrlKey) && u.key === "k")
      u.preventDefault(), n() ? A() : E();
    else if (u.key === "/" && !n() && ((h = document.activeElement) == null ? void 0 : h.tagName) !== "INPUT" && ((y = document.activeElement) == null ? void 0 : y.tagName) !== "TEXTAREA")
      u.preventDefault(), E();
    else if (n()) {
      const g = x();
      u.key === "Escape" ? A() : u.key === "ArrowDown" ? (u.preventDefault(), g.length > 0 && a((S) => (S + 1) % g.length)) : u.key === "ArrowUp" ? (u.preventDefault(), g.length > 0 && a((S) => (S - 1 + g.length) % g.length)) : u.key === "Enter" && g[f()] && (u.preventDefault(), window.location.href = g[f()].url);
    }
  }
  return xe(() => {
    window.addEventListener("keydown", _);
  }), he(() => {
    window.removeEventListener("keydown", _);
  }), (() => {
    var u = Re(), h = u.firstChild;
    return h.$$click = E, L(u, U(R, {
      get when() {
        return n();
      },
      get children() {
        var y = Fe(), g = y.firstChild, S = g.firstChild, Z = S.firstChild, j = Z.nextSibling, be = j.nextSibling;
        y.$$click = A, g.$$click = (I) => I.stopPropagation(), j.$$input = (I) => r(I.currentTarget.value);
        var ne = b;
        return typeof ne == "function" ? Ke(ne, j) : b = j, be.$$click = A, L(g, U(R, {
          get when() {
            return x().length > 0;
          },
          get fallback() {
            return U(R, {
              get when() {
                return l().trim() !== "";
              },
              get fallback() {
                return Qe();
              },
              get children() {
                return Ge();
              }
            });
          },
          get children() {
            var I = qe();
            return L(I, U(De, {
              get each() {
                return x();
              },
              children: (B, se) => (() => {
                var le = Xe(), P = le.firstChild, ve = P.firstChild;
                return P.addEventListener("mouseenter", () => a(se())), L(ve, () => B.title), L(P, U(R, {
                  get when() {
                    return Oe(() => !!B.headings)() && B.headings.length > 0;
                  },
                  get children() {
                    var C = He();
                    return L(C, () => B.headings.slice(0, 3).join(" · ")), C;
                  }
                }), null), K((C) => {
                  var ie = B.url, re = `island-result-item ${se() === f() ? "selected" : ""}`;
                  return ie !== C.e && Be(P, "href", C.e = ie), re !== C.t && Pe(P, C.t = re), C;
                }, {
                  e: void 0,
                  t: void 0
                }), le;
              })()
            })), I;
          }
        }), null), K(() => j.value = l()), y;
      }
    }), null), u;
  })();
}
je(["click", "input"]);
function ue() {
  const e = document.getElementById("search-island");
  if (e) {
    const t = e.getAttribute("data-index-url") || "/search-index.json";
    Me(() => U(We, {
      indexUrl: t
    }), e);
  }
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", ue) : ue();
