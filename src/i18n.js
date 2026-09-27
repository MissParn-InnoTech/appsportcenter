// Lightweight 2-language layer (ไทย / English).
// Thai is the source language written in App.jsx. When English is selected, every rendered
// text node / placeholder / title is swapped using the EN dictionary, and a MutationObserver
// keeps new content translated as React re-renders. Switching back restores the original Thai.
import { EN, EN_FRAGMENTS } from "./i18n-en.js";

const LANG_KEY = "act.lang";
const THAI = /[฀-๿]/;
const ATTRS = ["placeholder", "title", "aria-label"];
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE"]);

const nodeState = new WeakMap(); // Text node -> { orig, out }
const attrState = new WeakMap(); // Element -> { [attr]: { orig, out } }
let current = "th";
let observer = null;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// fragments only match as whole "words" (not inside a longer Thai word such as a name)
const fragRules = Object.keys(EN_FRAGMENTS)
  .sort((a, b) => b.length - a.length)
  .map((k) => [new RegExp(`(?<![\\u0E00-\\u0E7F])${escapeRe(k)}(?![\\u0E00-\\u0E7F])`, "g"), EN_FRAGMENTS[k]]);

export function translateText(s) {
  if (!s || !THAI.test(s)) return s;
  const lead = s.match(/^\s*/)[0];
  const trail = s.match(/\s*$/)[0];
  const core = s.trim();
  if (EN[core] !== undefined) return lead + EN[core] + trail;
  let out = core;
  for (const [re, en] of fragRules) out = out.replace(re, en);
  return lead + out + trail;
}

function skip(el) {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName) || (e.hasAttribute && e.hasAttribute("data-no-i18n"))) return true;
  }
  return false;
}

function doText(node) {
  const st = nodeState.get(node);
  const val = node.nodeValue;
  if (st && val === st.out) return; // already ours
  const orig = val;
  if (!THAI.test(orig)) { if (st) nodeState.delete(node); return; }
  if (skip(node.parentElement)) return;
  const out = translateText(orig);
  nodeState.set(node, { orig, out });
  if (out !== orig) node.nodeValue = out;
}

function doAttrs(el) {
  if (skip(el)) return;
  let st = attrState.get(el);
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    if (st && st[a] && st[a].out === v) continue;
    if (!THAI.test(v)) continue;
    const out = translateText(v);
    st = st || {};
    st[a] = { orig: v, out };
    attrState.set(el, st);
    if (out !== v) el.setAttribute(a, out);
  }
}

function walk(root) {
  if (root.nodeType === 3) return doText(root);
  if (root.nodeType !== 1) return;
  doAttrs(root);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = tw.nextNode())) (n.nodeType === 3 ? doText(n) : doAttrs(n));
}

function restore(root) {
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = tw.nextNode())) {
    if (n.nodeType === 3) {
      const st = nodeState.get(n);
      if (st && n.nodeValue === st.out) n.nodeValue = st.orig;
      nodeState.delete(n);
    } else {
      const st = attrState.get(n);
      if (st) { for (const a of Object.keys(st)) if (n.getAttribute(a) === st[a].out) n.setAttribute(a, st[a].orig); attrState.delete(n); }
    }
  }
}

export function getLang() {
  try { return localStorage.getItem(LANG_KEY) === "en" ? "en" : "th"; } catch { return "th"; }
}

export function applyLang(lang) {
  current = lang === "en" ? "en" : "th";
  try { localStorage.setItem(LANG_KEY, current); } catch { /* ignore */ }
  document.documentElement.lang = current;
  if (observer) { observer.disconnect(); observer = null; }
  if (current === "th") { restore(document.body); return; }
  walk(document.body);
  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") doText(m.target);
      else if (m.type === "attributes") doAttrs(m.target);
      else m.addedNodes.forEach(walk);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

// For strings shown outside the DOM (alert/confirm)
export const tr = (s) => (current === "en" ? translateText(s) : s);

// translate native dialogs too
if (typeof window !== "undefined" && !window.__i18nDialogs) {
  window.__i18nDialogs = true;
  const a = window.alert.bind(window), c = window.confirm.bind(window);
  window.alert = (m) => a(tr(String(m)));
  window.confirm = (m) => c(tr(String(m)));
  // วันที่ที่จัดรูปแบบแบบไทย (th-TH) → แสดงเป็นภาษาอังกฤษเมื่อเลือก EN
  const swap = (loc) => (current === "en" && (!loc || String(loc).startsWith("th")) ? "en-GB" : loc);
  ["toLocaleDateString", "toLocaleString", "toLocaleTimeString"].forEach((fn) => {
    const orig = Date.prototype[fn];
    Date.prototype[fn] = function (loc, opts) { return orig.call(this, swap(loc), opts); };
  });
}
