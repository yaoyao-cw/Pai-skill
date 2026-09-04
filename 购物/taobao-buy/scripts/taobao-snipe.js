/* Taobao drop-sale helper (portable)
 *
 * Lessons baked in:
 * - Clicking 立即购买 before drop -> 「请选择您要的商品信息」
 * - Synthetic JS SKU click is isTrusted=false and often fails
 * - Hard reload greys SKU / unloads this script
 * - Multi-tab freezes Chrome
 * - Keep clicking through captcha makes it worse
 *
 * Rules:
 * - Never click 立即购买 / 提交 before CONFIG drop time
 * - Never click SKU, never 加入购物车, never hard reload, never open tabs
 * - Halt on captcha or 「请选择您要的商品信息」
 * - Only click visible 立即购买 and 提交订单 / 确认下单
 * - Price must be inside [minPrice, maxPrice]; reject placeholder >=10000
 *
 * Primary path is still a real mouse for SKU + buy. This script is backup.
 */
(function () {
  "use strict";
  if (window.__taobaoSnipeV1) return;
  window.__taobaoSnipeV1 = true;
  window.__taobaoSnipe = true;

  var CONFIG = {
    itemId: "1075501920711",
    skuMatch: "v1\\.2",
    forbiddenSku: "防拍",
    minPrice: 100,
    maxPrice: 800,
    dropHour: 12,
    dropMinute: 0,
    timeZone: "Asia/Shanghai",
    qty: 1
  };

  var ITEM_ID = String(CONFIG.itemId || "");
  var FORBIDDEN = String(CONFIG.forbiddenSku || "");
  var MIN_PRICE = Number(CONFIG.minPrice);
  var MAX_PRICE = Number(CONFIG.maxPrice);
  var DROP_H = Number(CONFIG.dropHour);
  var DROP_M = Number(CONFIG.dropMinute);
  var TZ = CONFIG.timeZone || "Asia/Shanghai";
  var SKU_RE;
  try {
    SKU_RE = new RegExp(CONFIG.skuMatch, "i");
  } catch (e) {
    SKU_RE = /./;
  }

  var bought = false;
  var stopped = false;
  var stopReason = "";
  var dropFired = false;
  var lastBuyClickAt = 0;

  function msUntilDrop() {
    var str = new Date().toLocaleString("sv-SE", { timeZone: TZ });
    var day = str.slice(0, 10);
    var hh = String(DROP_H).padStart(2, "0");
    var mm = String(DROP_M).padStart(2, "0");
    return new Date(day + "T" + hh + ":" + mm + ":00+08:00").getTime() - Date.now();
  }
  function clock() {
    return new Date().toLocaleString("sv-SE", { timeZone: TZ }).slice(11, 23);
  }
  function afterDrop() { return msUntilDrop() <= 0; }

  function textOf(el) {
    if (!el) return "";
    return String(el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  }
  function classOf(el) {
    if (!el) return "";
    var c = el.className;
    if (typeof c === "string") return c;
    if (c && c.baseVal) return String(c.baseVal);
    return String(c || "");
  }
  function walkUp(el, n) {
    var out = [];
    var p = el;
    for (var i = 0; i < n && p; i++) { out.push(p); p = p.parentElement; }
    return out;
  }
  function isVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 36 || r.height < 16) return false;
    if (r.bottom < 0 || r.top > (window.innerHeight || 800) + 40) return false;
    try {
      var st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") return false;
      if (parseFloat(st.opacity) < 0.2) return false;
    } catch (e) {}
    return true;
  }
  function isDisabled(el) {
    if (!el) return true;
    var nodes = walkUp(el, 5);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var cls = classOf(n);
      if (/isDisabled|disabled|soldOut|soldout|sold-out/i.test(cls)) return true;
      if (n.getAttribute && n.getAttribute("aria-disabled") === "true") return true;
      if (n.hasAttribute && n.hasAttribute("disabled")) return true;
    }
    try {
      var st = getComputedStyle(el);
      if (st && parseFloat(st.opacity) < 0.65) return true;
      if (st && st.pointerEvents === "none") return true;
    } catch (e2) {}
    return false;
  }

  function findSkuChip() {
    var nodes = document.querySelectorAll("div, span, a, li, button, label");
    var best = null;
    var bestLen = 1e9;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.children && el.children.length > 6) continue;
      var t = textOf(el);
      if (!t || t.length > 80) continue;
      if (FORBIDDEN && t.indexOf(FORBIDDEN) !== -1) continue;
      if (!SKU_RE.test(t)) continue;
      if (t.length < bestLen) { best = el; bestLen = t.length; }
    }
    return best;
  }

  function findBuyBtn() {
    var nodes = document.querySelectorAll("button, a, div, span");
    var cands = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var t = textOf(el);
      if (!t || t.length > 16) continue;
      if (t.indexOf("加入购物车") !== -1) continue;
      if (t.indexOf("收藏") !== -1) continue;
      if (t.indexOf("即将开始") !== -1) continue;
      if (t !== "立即购买") continue;
      if (!isVisible(el)) continue;
      var r = el.getBoundingClientRect();
      cands.push({ el: el, area: r.width * r.height, top: r.top });
    }
    if (!cands.length) return null;
    cands.sort(function (a, b) {
      if (b.area !== a.area) return b.area - a.area;
      return b.top - a.top;
    });
    return cands[0].el;
  }

  function findSubmitBtn() {
    var nodes = document.querySelectorAll("button, a, div, span");
    var cands = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var t = textOf(el);
      if (!t || t.length > 12) continue;
      if (t !== "提交订单" && t !== "确认下单") continue;
      if (!isVisible(el)) continue;
      var r = el.getBoundingClientRect();
      cands.push({ el: el, area: r.width * r.height });
    }
    cands.sort(function (a, b) { return b.area - a.area; });
    return cands.length ? cands[0].el : null;
  }

  function parsePrice() {
    var body = document.body ? document.body.innerText : "";
    var found = [];
    var re = /[¥￥]\s*([0-9]{2,6}(?:\.[0-9]{1,2})?)/g;
    var m;
    while ((m = re.exec(body))) found.push(parseFloat(m[1]));
    var ok = found.filter(function (n) { return n >= MIN_PRICE && n <= MAX_PRICE; });
    if (ok.length) return ok[0];
    var bad = found.filter(function (n) { return n >= 10000; });
    if (bad.length) return bad[0];
    return found.length ? found[0] : null;
  }
  function priceOk(p) {
    return p != null && p >= MIN_PRICE && p <= MAX_PRICE;
  }

  function pageText() {
    return document.body ? document.body.innerText : "";
  }
  function hasCaptcha() {
    if (document.querySelector('iframe[src*="captcha"], iframe[src*="punish"], iframe[src*="punish-page"], .nc-container, #nocaptcha')) return true;
    var t = pageText();
    return /拖动滑块|请完成验证|考拉|安全验证|点击验证/.test(t);
  }
  function skuNotChosenToast() {
    return /请选择您要的商品信息/.test(pageText());
  }

  function tap(el) {
    if (!el) return false;
    try { el.scrollIntoView({ block: "center", inline: "center" }); } catch (e) {}
    try { el.click(); } catch (e2) {}
    return true;
  }

  function onItemPage() { return /item\.(taobao|tmall)\.com/.test(location.hostname); }
  function onBuyPage() { return /buy\.(taobao|tmall)/.test(location.hostname); }
  function rightItem() {
    return !ITEM_ID || !onItemPage() || location.href.indexOf(ITEM_ID) !== -1;
  }

  function rectOf(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
  }

  function snapshot() {
    var sku = findSkuChip();
    var buy = findBuyBtn();
    var price = parsePrice();
    var state = {
      clock: clock(),
      msToDrop: Math.round(msUntilDrop()),
      afterDrop: afterDrop(),
      skuText: sku ? textOf(sku) : "",
      skuDisabled: sku ? isDisabled(sku) : true,
      skuRect: rectOf(sku),
      price: price,
      priceOk: priceOk(price),
      buyText: buy ? textOf(buy) : (pageText().indexOf("加入购物车") !== -1 ? "加入购物车" : ""),
      buyRect: rectOf(buy),
      captcha: hasCaptcha(),
      needSku: skuNotChosenToast(),
      bought: bought,
      stopped: stopped,
      stopReason: stopReason,
      config: { itemId: ITEM_ID, forbiddenSku: FORBIDDEN, minPrice: MIN_PRICE, maxPrice: MAX_PRICE, dropHour: DROP_H, dropMinute: DROP_M }
    };
    window.__taobaoSnipeState = state;
    return state;
  }

  function setStatus(s) {
    var el = document.getElementById("taobao-snipe-status");
    if (el) el.textContent = clock() + "  " + s;
    snapshot();
  }
  function ensureOverlay() {
    if (document.getElementById("taobao-snipe-overlay") || !document.body) return;
    var box = document.createElement("div");
    box.id = "taobao-snipe-overlay";
    box.style.cssText =
      "position:fixed;z-index:2147483647;left:12px;bottom:12px;background:#111;color:#0f0;" +
      "font:12px/1.45 monospace;padding:8px 10px;border-radius:6px;opacity:.92;max-width:520px;";
    box.innerHTML = "<div>taobao-snipe 只点立即购买</div><div id=\"taobao-snipe-status\">starting</div>";
    document.body.appendChild(box);
  }

  function halt(reason) {
    stopped = true;
    stopReason = reason;
    setStatus("停手：" + reason);
  }

  function tryBuyPage() {
    if (hasCaptcha()) { halt("验证码"); return false; }
    var btn = findSubmitBtn();
    if (btn) {
      tap(btn);
      bought = true;
      setStatus("已点提交订单，请用手机付款");
      return true;
    }
    setStatus("确认订单页，找提交按钮");
    return false;
  }

  function tryOnce() {
    if (bought || stopped) return bought;
    if (hasCaptcha()) { halt("验证码"); return false; }
    if (skuNotChosenToast()) { halt("请选择商品信息（SKU 没选上，需真人点选）"); return false; }
    if (onBuyPage()) return tryBuyPage();
    if (!afterDrop()) {
      setStatus("未到开售，不点购买  倒计时 " + (msUntilDrop() / 1000).toFixed(2) + "s");
      return false;
    }
    if (!onItemPage() || !rightItem()) {
      setStatus("不是目标商品页");
      return false;
    }
    var sku = findSkuChip();
    var price = parsePrice();
    var buy = findBuyBtn();
    if (!sku) { setStatus("找不到目标 SKU"); return false; }
    if (isDisabled(sku)) {
      halt("目标 SKU 已灰/售罄 价=" + price);
      return false;
    }
    if (!priceOk(price)) {
      setStatus("价格不对 " + price + "，不下单");
      return false;
    }
    if (!buy) {
      setStatus("开售后仍无立即购买，等待按钮切换（不点购物车）");
      return false;
    }
    tap(buy);
    lastBuyClickAt = Date.now();
    setStatus("已点立即购买 价=" + price);
    return false;
  }

  function fireDrop() {
    if (dropFired) return;
    dropFired = true;
    setStatus("开售开火");
    for (var i = 0; i < 10; i++) tryOnce();
  }

  function armExact(fn) {
    function tick() {
      var left = msUntilDrop();
      if (left <= 0) { fn(); return; }
      if (left > 250) setTimeout(tick, Math.min(left - 30, 1000));
      else requestAnimationFrame(tick);
    }
    tick();
  }

  function loop() {
    ensureOverlay();
    if (bought || stopped) return;
    if (onBuyPage()) { tryBuyPage(); return; }
    if (!afterDrop()) {
      var sku = findSkuChip();
      var price = parsePrice();
      setStatus(
        "倒计时 " + (msUntilDrop() / 1000).toFixed(2) + "s  " +
        "sku=" + (sku ? (isDisabled(sku) ? "灰" : "在") : "?") +
        " 价=" + (price != null ? price : "?") +
        " 按钮=" + (findBuyBtn() ? "立即购买" : "未出")
      );
      return;
    }
    tryOnce();
  }

  function start() {
    ensureOverlay();
    if (afterDrop() && msUntilDrop() > -20000) {
      setStatus("已过开售时刻，立刻尝试");
      tryOnce();
    } else {
      setStatus("已挂上。开售前不点购买。请先真人点选目标 SKU");
    }
    armExact(fireDrop);
    setInterval(loop, 40);
    function raf() {
      if (afterDrop() && msUntilDrop() > -15000) loop();
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    if (document.body) {
      var mo = new MutationObserver(function () {
        if (afterDrop()) tryOnce();
      });
      mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
