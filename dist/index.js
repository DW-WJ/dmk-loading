import { defineComponent as mt, shallowRef as bt, onMounted as V, onBeforeUnmount as rt, computed as c, watch as at, ref as It, openBlock as v, createBlock as U, Transition as Vt, withCtx as Ft, withDirectives as qt, createElementVNode as L, mergeProps as Gt, normalizeClass as Nt, createElementBlock as k, Fragment as T, renderList as D, normalizeStyle as B, createCommentVNode as W, toDisplayString as Rt, vShow as Kt, onUnmounted as X, Teleport as ct, createVNode as ut, unref as Ut, createApp as Wt, getCurrentInstance as Yt } from "vue";
const ft = /* @__PURE__ */ new WeakMap(), Y = /* @__PURE__ */ new Set();
function Zt(t) {
  let e = ft.get(t);
  return e || (e = /* @__PURE__ */ new Set(), ft.set(t, e)), e;
}
function wt(t, e) {
  return Y.add(e), () => Y.delete(e);
}
function Jt(t) {
  Y.forEach((e) => Qt(e));
}
function $(t) {
  Jt();
}
function Qt(t) {
  try {
    t();
  } catch (e) {
    typeof console < "u" && console.warn("[loading-core] 订阅回调异常：", e);
  }
}
function xt(t) {
  return Zt(t), t;
}
function Xt(t) {
  let e = t();
  return {
    get value() {
      return e;
    },
    // 提供手动失效入口，供适配层在状态变更时调用
    invalidate() {
      e = t();
    }
  };
}
const St = {
  text: "加载中...",
  textPosition: "center",
  spinner: "ring",
  transition: "fade",
  maskStyle: "soft",
  color: "#3b82f6",
  textColor: "#ffffff",
  maskColor: "",
  size: "default",
  delay: 120,
  minDuration: 0,
  lockScroll: !0,
  appendTo: null
};
let te = 0;
const ee = () => `vtl-${Date.now().toString(36)}-${(te++).toString(36)}`;
let x = { ...St };
function _t() {
  return { token: "", scope: "global", target: null, options: { ...x }, payload: void 0 };
}
function g(t, e, o) {
  if (t == null) return o;
  if (typeof t == "function")
    try {
      return t(e);
    } catch (n) {
      return console.warn("[dmk-loading] 配置函数求值失败，已回退默认值：", n), o;
    }
  return t;
}
function tt(t, e = St, o = _t()) {
  const n = { ...e };
  if (!t) return n;
  const l = { ...o, options: n };
  return n.text = g(t.text, l, e.text), n.textPosition = g(t.textPosition, l, e.textPosition), n.spinner = g(t.spinner, l, e.spinner), n.transition = g(t.transition, l, e.transition), n.maskStyle = g(t.maskStyle, l, e.maskStyle), n.color = g(t.color, l, e.color), n.textColor = g(t.textColor, l, e.textColor), n.maskColor = g(t.maskColor, l, e.maskColor), n.size = g(t.size, l, e.size), t.delay !== void 0 && (n.delay = t.delay), t.minDuration !== void 0 && (n.minDuration = t.minDuration), t.lockScroll !== void 0 && (n.lockScroll = t.lockScroll), t.appendTo !== void 0 && (n.appendTo = t.appendTo ?? null), n;
}
function Ct(t) {
  x = tt(t, x, _t());
}
function oe() {
  return { ...x };
}
const r = xt({
  global: {
    key: "global",
    el: null,
    visible: !1,
    options: { ...x },
    tokens: [],
    originPosition: "",
    shownAt: 0,
    raw: {},
    payload: void 0,
    hooks: {},
    ctx: null
  },
  locals: {},
  tokens: {}
});
function ne() {
  return r;
}
Xt(() => r.global.visible);
function et(t) {
  const e = M(t);
  if (!e) return r.global.visible;
  const o = ot(e);
  return o ? o.visible : !1;
}
let le = 0;
const dt = /* @__PURE__ */ new WeakMap();
function Lt(t) {
  let e = dt.get(t);
  return e || (e = `local-${le++}`, dt.set(t, e)), e;
}
function M(t) {
  if (!t) return null;
  if (typeof t == "string") {
    if (typeof document > "u") return null;
    const o = t.trim();
    if (!o) return null;
    const n = document.querySelector(o);
    if (n) return n;
    const l = o.replace(/^[#.]/, "");
    if (l !== o) {
      const i = document.getElementById(l);
      if (i) return i;
      const a = document.querySelector(`.${pt(l)}`);
      if (a) return a;
    } else {
      const i = document.getElementById(l);
      if (i) return i;
      if (/^[A-Za-z][\w\-:.]*$/.test(l)) {
        const a = document.querySelector(`#${pt(l)}`);
        if (a) return a;
      }
    }
    return null;
  }
  if (t.nodeType === 1) return t;
  const e = t;
  return e.$el && e.$el.nodeType === 1 ? e.$el : e.value !== void 0 ? M(e.value) : null;
}
function pt(t) {
  return typeof CSS < "u" && typeof CSS.escape == "function" ? CSS.escape(t) : t.replace(/([^\w-])/g, "\\$1");
}
function ot(t) {
  const e = Lt(t);
  return r.locals[e];
}
function ie(t) {
  const e = M(t);
  return e ? ot(e) : void 0;
}
const F = /* @__PURE__ */ new WeakMap();
function se(t) {
  let e = F.get(t);
  return e || (e = {}, F.set(t, e)), e;
}
function yt(t) {
  const e = F.get(t);
  e && (e.show && window.clearTimeout(e.show), e.hide && window.clearTimeout(e.hide), F.set(t, {}));
}
function I(t, e, o) {
  var i;
  const n = (i = t.hooks) == null ? void 0 : i[e];
  if (typeof n != "function") return;
  const l = nt(t);
  try {
    e === "onSuccess" || e === "onError" ? n(o, l) : n(l);
  } catch (a) {
    console.warn(`[dmk-loading] ${e} 钩子执行失败：`, a);
  }
}
function nt(t) {
  return t.ctx || {
    token: t.tokens[t.tokens.length - 1] || "",
    scope: t.el ? "local" : "global",
    target: t.el,
    options: t.options,
    payload: t.payload
  };
}
function re(t, e, o) {
  I(t, e, o);
}
function Z(t, e) {
  const o = se(t);
  if (e) {
    o.show && window.clearTimeout(o.show);
    const n = t.options.delay;
    n > 0 ? o.show = window.setTimeout(() => {
      o.show = void 0, t.visible = !0, t.shownAt = performance.now(), I(t, "onShow"), $();
    }, n) : (t.visible = !0, t.shownAt = performance.now(), I(t, "onShow"), $());
  } else {
    if (o.show) {
      window.clearTimeout(o.show), o.show = void 0;
      return;
    }
    o.hide && (window.clearTimeout(o.hide), o.hide = void 0);
    const n = () => {
      o.hide = void 0, t.visible = !1, t.shownAt = 0, I(t, "onHide"), $();
    }, l = t.options.minDuration, i = t.shownAt ? performance.now() - t.shownAt : 1 / 0;
    if (l > 0 && i < l) {
      o.hide = window.setTimeout(n, l - i);
      return;
    }
    n();
  }
}
function _(t, e) {
  let o = null, n;
  typeof t == "string" || t && t.nodeType === 1 ? (o = t, n = e) : (n = t || e, n && typeof n == "object" && typeof n.toOptions == "function" && (n = n.toOptions()), typeof n == "object" && (n != null && n.target) && (o = n.target));
  const l = ee();
  let i = {};
  if (typeof n == "function") {
    try {
      i = n({ token: l, scope: o ? "local" : "global", target: o, options: { ...x } }) || {};
    } catch (p) {
      console.warn("[dmk-loading] 方案工厂执行失败，已使用默认配置：", p), i = {};
    }
    !o && i.target && (o = i.target);
  } else n && (i = n);
  const a = i, h = {
    onShow: a.onShow,
    onHide: a.onHide,
    onSuccess: a.onSuccess,
    onError: a.onError,
    onFinally: a.onFinally
  }, b = {
    token: l,
    scope: o ? "local" : "global",
    target: o,
    options: { ...x },
    payload: i.payload
  }, f = tt(i, x, b), C = (p, N, O) => (p.options = f, p.raw = i, p.payload = i.payload, p.hooks = h, p.ctx = { ...b, scope: N ? "local" : "global", options: f }, $(), p.tokens.push(l), r.tokens[l] = O, p.tokens.length === 1 ? Z(p, !0) : (p.visible = !0, $()), { token: l, key: O });
  if (!o)
    return C(r.global, null, "global");
  const d = M(o);
  if (!d)
    return typeof console < "u" && console.warn("[dmk-loading] 未找到局部遮罩目标，已降级为全局：", o), C(r.global, null, "global");
  const A = Lt(d);
  let w = r.locals[A];
  return w || (w = xt({
    key: A,
    el: d,
    visible: !1,
    options: f,
    tokens: [],
    originPosition: d.style.position || "",
    shownAt: 0,
    raw: i,
    payload: i.payload,
    hooks: h,
    ctx: null
  }), r.locals[A] = w), C(w, d, A);
}
function S(t) {
  if (t == null || typeof t == "number") {
    E("global");
    return;
  }
  if (typeof t == "string") {
    if (r.tokens[t]) {
      $t(t);
      return;
    }
    const o = ie(t);
    if (o) {
      E(o.key);
      return;
    }
    E("global");
    return;
  }
  const e = ot(t);
  if (e) {
    E(e.key);
    return;
  }
  E("global");
}
function E(t) {
  const e = t === "global" ? r.global : r.locals[t];
  !e || e.tokens.length === 0 || $t(e.tokens[e.tokens.length - 1]);
}
function $t(t) {
  if (!t) return;
  const e = r.tokens[t];
  if (delete r.tokens[t], !e) return;
  if (e === "global") {
    const l = r.global, i = l.tokens.indexOf(t);
    i > -1 && l.tokens.splice(i, 1), l.tokens.length === 0 && Z(l, !1);
    return;
  }
  const o = r.locals[e];
  if (!o) return;
  const n = o.tokens.indexOf(t);
  n > -1 && o.tokens.splice(n, 1), o.tokens.length === 0 && (Z(o, !1), window.setTimeout(() => {
    const l = r.locals[e];
    l && l.tokens.length === 0 && delete r.locals[e];
  }, 400));
}
function q() {
  r.global.tokens.splice(0, r.global.tokens.length), yt(r.global), r.global.visible = !1, Object.keys(r.tokens).forEach((t) => delete r.tokens[t]), Object.keys(r.locals).forEach((t) => {
    const e = r.locals[t];
    e.tokens.splice(0, e.tokens.length), yt(e), e.visible = !1, delete r.locals[t];
  }), $();
}
function z(t, e) {
  let o, n;
  typeof t == "string" ? (o = t, n = e) : n = t;
  const l = o ? it(o) : r.global;
  if (!l) return;
  const i = nt(l), a = typeof n == "function" ? n(i) : n;
  a && (l.options = tt(a, l.options, i), l.raw = { ...l.raw, ...a }, l.ctx && (l.ctx = { ...l.ctx, options: l.options }), $());
}
function At(t) {
  z({ text: t });
}
function lt() {
  return r.global.visible ? !0 : Object.values(r.locals).some((t) => t.visible);
}
function ae() {
  return Object.values(r.locals);
}
function it(t) {
  const e = r.tokens[t];
  if (e)
    return e === "global" ? r.global : r.locals[e];
}
const ce = ["aria-busy", "aria-label"], ue = { class: "vtl-inner" }, fe = {
  key: 0,
  class: "vtl-ring"
}, de = {
  key: 3,
  class: "vtl-pulse"
}, pe = {
  key: 5,
  class: "vtl-orbit"
}, ye = {
  key: 0,
  class: "vtl-text"
}, vt = /* @__PURE__ */ mt({
  __name: "LoadingMask",
  props: {
    slot: {}
  },
  emits: ["closed"],
  setup(t, { emit: e }) {
    const o = t, n = e, l = bt(0);
    let i = null;
    V(() => {
      i = wt(null, () => {
        l.value++;
      });
    }), rt(() => {
      i == null || i(), i = null;
    });
    const a = c(() => ({ "data-vtl-signal": l.value })), h = c(() => (l.value, o.slot.el === null)), b = c(() => (l.value, o.slot.ctx ?? {
      token: o.slot.tokens[o.slot.tokens.length - 1] || "",
      scope: h.value ? "global" : "local",
      target: o.slot.el,
      options: o.slot.options,
      payload: o.slot.payload
    }));
    function f(s) {
      l.value;
      const u = o.slot.raw;
      return u && u[s] !== void 0 ? g(u[s], b.value, o.slot.options[s]) : o.slot.options[s];
    }
    const C = c(() => f("text")), d = c(() => f("spinner")), A = c(() => f("transition")), w = c(() => f("maskStyle")), p = c(() => f("size")), N = c(() => f("textPosition")), O = c(() => f("color")), zt = c(() => f("textColor")), Ht = c(() => {
      const s = f("maskColor"), u = {
        position: h.value ? "fixed" : "absolute",
        inset: "0",
        "--vtl-color": O.value,
        "--vtl-text-color": zt.value
      };
      return s ? u.background = s : w.value === "solid" ? u.background = "rgba(15, 23, 42, 0.72)" : w.value === "soft" ? u.background = "rgba(15, 23, 42, 0.42)" : u.background = "transparent", u;
    }), Mt = c(() => `vtl-size-${p.value}`), Ot = c(() => `vtl-text-${N.value}`);
    V(() => {
      const s = o.slot.el;
      s && (getComputedStyle(s).position === "static" && (s.style.position = "relative"), getComputedStyle(s).overflow === "visible" && (s.style.overflow = "hidden"));
    }), rt(() => {
      const s = o.slot.el;
      s && (s.style.position = o.slot.originPosition, s.style.overflow = ""), s && (s.removeAttribute("aria-busy"), s.removeAttribute("data-vtl-loading")), n("closed", o.slot.key);
    }), at(
      () => l.value,
      () => {
        const s = o.slot.el;
        s && (o.slot.visible ? (s.setAttribute("aria-busy", "true"), s.setAttribute("data-vtl-loading", "")) : (s.removeAttribute("aria-busy"), s.removeAttribute("data-vtl-loading")));
      },
      { immediate: !0 }
    ), at(
      () => l.value,
      () => {
        const s = o.slot.visible;
        typeof document > "u" || h.value && o.slot.options.lockScroll && (s ? document.body.style.setProperty("overflow", "hidden") : document.body.style.removeProperty("overflow"));
      },
      { immediate: !0 }
    );
    const R = It(!1);
    if (typeof window < "u" && window.matchMedia) {
      const s = window.matchMedia("(prefers-reduced-motion: reduce)");
      R.value = s.matches;
      const u = (y) => {
        R.value = y.matches;
      };
      typeof s.addEventListener == "function" ? s.addEventListener("change", u) : typeof s.addListener == "function" && s.addListener(u);
    }
    const Bt = c(() => R.value ? "vtl-reduce-motion" : "");
    return (s, u) => (v(), U(Vt, {
      name: `vtl-${A.value}`,
      persisted: ""
    }, {
      default: Ft(() => [
        qt(L("div", Gt(a.value, {
          class: ["vtl-mask", [Mt.value, Ot.value, `vtl-mask-${w.value}`, Bt.value]],
          style: Ht.value,
          role: "status",
          "aria-live": "polite",
          "aria-busy": t.slot.visible,
          "aria-label": C.value || void 0
        }), [
          L("div", ue, [
            L("div", {
              class: Nt(["vtl-spinner", `vtl-spinner-${d.value}`]),
              "aria-hidden": "true"
            }, [
              d.value === "ring" ? (v(), k("span", fe)) : d.value === "dots" ? (v(), k(T, { key: 1 }, D(3, (y) => L("span", {
                key: y,
                class: "vtl-dot",
                style: B({ animationDelay: `${(y - 1) * 0.15}s` })
              }, null, 4)), 64)) : d.value === "bars" ? (v(), k(T, { key: 2 }, D(5, (y) => L("span", {
                key: y,
                class: "vtl-bar",
                style: B({ animationDelay: `${(y - 1) * 0.12}s` })
              }, null, 4)), 64)) : d.value === "pulse" ? (v(), k("span", de)) : d.value === "wave" ? (v(), k(T, { key: 4 }, D(5, (y) => L("span", {
                key: y,
                class: "vtl-wave-bar",
                style: B({ animationDelay: `${(y - 1) * 0.1}s` })
              }, null, 4)), 64)) : d.value === "orbit" ? (v(), k("span", pe, [
                (v(), k(T, null, D(3, (y) => L("i", {
                  key: y,
                  style: B({ transform: `rotate(${y * 120}deg) translateY(-8px)` })
                }, null, 4)), 64))
              ])) : W("", !0)
            ], 2),
            C.value ? (v(), k("p", ye, Rt(C.value), 1)) : W("", !0)
          ])
        ], 16, ce), [
          [Kt, t.slot.visible]
        ])
      ]),
      _: 1
    }, 8, ["name"]));
  }
}), ve = /* @__PURE__ */ mt({
  __name: "LoadingHost",
  setup(t) {
    const e = ne(), o = bt(0);
    let n = null;
    V(() => {
      n = wt(null, () => {
        o.value++;
      }), o.value++;
    }), X(() => {
      n == null || n(), n = null;
    });
    const l = c(
      () => e.global.options.appendTo || (typeof document < "u" ? document.body : null)
    ), i = c(() => (o.value, ae().filter((a) => !!a.el && a.el.isConnected)));
    return (a, h) => (v(), k(T, null, [
      l.value ? (v(), U(ct, {
        key: 0,
        to: l.value
      }, [
        ut(vt, {
          slot: Ut(e).global
        }, null, 8, ["slot"])
      ], 8, ["to"])) : W("", !0),
      (v(!0), k(T, null, D(i.value, (b) => (v(), U(ct, {
        key: b.key,
        to: b.el
      }, [
        ut(vt, {
          slot: b
        }, null, 8, ["slot"])
      ], 8, ["to"]))), 128))
    ], 64));
  }
});
function J(t, e) {
  if (typeof t == "boolean")
    return { visible: t, options: {} };
  if (t && typeof t == "object") {
    const o = t, n = { ...o }, l = o.visible !== void 0 ? o.visible : !0;
    return delete n.visible, { visible: l, options: n };
  }
  return { visible: t != null, options: {} };
}
function he(t, e) {
  const o = { ...t }, n = ["ring", "dots", "bars", "pulse", "wave", "orbit"];
  for (const i of n)
    e[i] && (o.spinner = i);
  const l = ["fade", "zoom", "slideDown", "slideUp", "blur"];
  for (const i of l)
    e[i] && (o.transition = i);
  return e.solid && (o.maskStyle = "solid"), e.soft && (o.maskStyle = "soft"), e.transparent && (o.maskStyle = "transparent"), e.small && (o.size = "small"), e.large && (o.size = "large"), e.top && (o.textPosition = "top"), e.bottom && (o.textPosition = "bottom"), o;
}
function ht(t, e) {
  const { visible: o, options: n } = J(e.value, e.modifiers), l = he(n, e.modifiers);
  if (!o) return;
  const i = _(t, l);
  t.__vtl_token__ = i.token;
}
function gt(t) {
  const e = t.__vtl_token__;
  e && (S(e), delete t.__vtl_token__);
}
const kt = {
  mounted(t, e) {
    ht(t, e);
  },
  updated(t, e) {
    if (e.value === e.oldValue) return;
    const o = J(e.oldValue, e.modifiers).visible, { visible: n } = J(e.value, e.modifiers);
    o !== n && (n ? ht(t, e) : gt(t));
  },
  unmounted(t) {
    gt(t);
  }
};
function ge(t) {
  return !!t && typeof t == "object" && typeof t.toOptions == "function";
}
function ke(t) {
  return t === "onShow" || t === "onHide" || t === "onSuccess" || t === "onError" || t === "onFinally";
}
function j(t) {
  const e = { options: {}, hooks: {}, target: void 0 };
  if (t == null) return e;
  if (ge(t)) {
    const n = t.toOptions();
    return j(n);
  }
  if (typeof t == "function") {
    try {
      const n = t({
        token: "",
        scope: "global",
        target: null
      });
      if (n && typeof n == "object") return j(n);
      typeof n == "string" && (e.options.text = n);
    } catch (n) {
      console.warn("[dmk-loading] 方案工厂执行失败，使用默认配置：", n);
    }
    return e;
  }
  const o = t;
  if ("plan" in o || "hooks" in o) {
    const n = o.plan;
    if (n != null) {
      const l = j(n);
      Object.assign(e.options, l.options), Object.assign(e.hooks, l.hooks);
    }
    return o.target !== void 0 && (e.target = o.target), o.hooks && typeof o.hooks == "object" && Object.assign(e.hooks, o.hooks), e;
  }
  for (const [n, l] of Object.entries(o))
    ke(n) ? e.hooks[n] = l : n === "target" ? e.target = l : e.options[n] = l;
  return e;
}
function me(t, e) {
  return typeof t != "function" ? t : t.length === 0 ? t() : t(e);
}
async function Tt(t, e, o) {
  const n = { ...e.options, target: e.target, ...e.hooks }, l = o(n);
  try {
    const i = it(l.token), a = i ? nt(i) : { token: l.token }, h = await me(t, a);
    return K(l.token, "onSuccess", h), h;
  } catch (i) {
    throw K(l.token, "onError", i), i;
  } finally {
    K(l.token, "onFinally"), S(l.token);
  }
}
async function G(t, e) {
  return Tt(t, j(e), (o) => _(o));
}
async function st(t, e, o) {
  if (!M(t))
    return G(e, o);
  const n = j(o);
  return n.target = t, Tt(e, n, (l) => _(l));
}
function K(t, e, o) {
  const n = it(t);
  n && re(n, e, o);
}
class H {
  constructor(e = {}, o = {}) {
    this.opts = { ...e }, this.hks = { ...o };
  }
  /** 合并配置 */
  with(e) {
    const o = typeof e == "function" ? e({}) : e;
    return new H({ ...this.opts, ...o }, this.hks);
  }
  /** 覆盖文案 */
  text(e) {
    return this.with({ text: e });
  }
  /** 指定指示器 */
  spinner(e) {
    return this.with({ spinner: e });
  }
  /** 指定过渡动画 */
  transition(e) {
    return this.with({ transition: e });
  }
  /** 遮罩底色风格 */
  maskStyle(e) {
    return this.with({ maskStyle: e });
  }
  /** 尺寸 */
  size(e) {
    return this.with({ size: e });
  }
  /** 主题色 */
  color(e) {
    return this.with({ color: e });
  }
  /** 文案位置 */
  textPosition(e) {
    return this.with({ textPosition: e });
  }
  /** 出现延迟 */
  delay(e) {
    return this.with({ delay: e });
  }
  /** 最短显示时长 */
  minDuration(e) {
    return this.with({ minDuration: e });
  }
  /** 指定局部目标，派生新方案 */
  target(e) {
    return this.with({ target: e });
  }
  /** 透传数据，供函数式文案读取 */
  payload(e) {
    return this.with({ payload: e });
  }
  /** 绑定生命周期钩子 */
  hooks(e) {
    return new H(this.opts, { ...this.hks, ...e });
  }
  /** 成功回调 */
  onSuccess(e) {
    return this.hooks({ onSuccess: e });
  }
  /** 失败回调 */
  onError(e) {
    return this.hooks({ onError: e });
  }
  /** 收尾回调 */
  onFinally(e) {
    return this.hooks({ onFinally: e });
  }
  /** 显示回调 */
  onShow(e) {
    return this.hooks({ onShow: e });
  }
  /** 隐藏回调 */
  onHide(e) {
    return this.hooks({ onHide: e });
  }
  /** 导出为纯配置对象 */
  toOptions() {
    return { ...this.opts, ...this.hks };
  }
  /** 导出为方案工厂函数（延迟求值） */
  toPlan() {
    const e = this.toOptions();
    return () => e;
  }
}
function m(t) {
  return typeof t == "string" ? new H({ text: t }) : new H({ ...t || {} });
}
const Et = {
  /** 快速操作：短延迟、不闪烁 */
  quick: (t = "处理中") => m(t).delay(0),
  /** 常规请求 */
  normal: (t = "加载中...") => m(t).delay(120).minDuration(200),
  /** 耗时操作：更长的最短显示，避免闪烁 */
  heavy: (t = "处理中，请稍候") => m(t).delay(200).minDuration(600).spinner("wave"),
  /** 表格查询：局部常用 */
  table: (t = "查询中") => m(t).spinner("dots").maskStyle("soft").delay(100),
  /** 表单提交 */
  submit: (t = "提交中") => m(t).spinner("bars").color("#10b981").delay(0),
  /** 删除等危险操作 */
  danger: (t = "处理中") => m(t).spinner("pulse").color("#ef4444").delay(0),
  /** 局部区域：卡片等 */
  region: (t = "加载中") => m(t).spinner("orbit").maskStyle("soft")
};
function Pt() {
  return {
    open: _,
    close: S,
    closeAll: q,
    isLoading: et,
    hasLoading: lt,
    withLoading: G,
    withLoadingOn: st,
    preset: m,
    presets: Et
  };
}
function be(t = {}) {
  if (typeof window > "u") return !1;
  const e = t.keys && t.keys.length ? t.keys : ["$loading"], o = Pt();
  let n = !1;
  for (const l of e)
    !t.overwrite && l in window || (window[l] = o, n = !0);
  return n;
}
function _e(t, e = "$loading") {
  t.config.globalProperties[e] = Pt();
}
function Ce(t = "$loading") {
  return typeof window > "u" ? !1 : t in window;
}
const we = "vtl-loading";
let P = null;
function Dt(t) {
  if (P) return P;
  const e = t || document.createElement("div");
  return t || (e.setAttribute("data-vtl-host", ""), document.body.appendChild(e)), P = Wt(ve), P.mount(e), P;
}
const Le = {
  install(t, e = {}) {
    jt(t, e);
  }
};
function jt(t, e = {}) {
  e && Object.keys(e).length && Ct(e), typeof document < "u" && Dt(), t.directive(we, kt), e.legacyDirective && t.directive("loading", kt), t.provide("vtl", Q());
  const o = Q();
  t.config.globalProperties.$loading = o, t.config.globalProperties.$vtl = o, e.global !== !1 && be(e.inject ?? {}), xe(t);
}
function Q() {
  return {
    open: _,
    close: S,
    closeAll: q,
    setText: At,
    update: z,
    isLoading: et,
    hasLoading: lt,
    withLoading: G,
    withLoadingOn: st,
    preset: m,
    presets: Et,
    setDefaults: Ct,
    getDefaults: oe
  };
}
function xe(t) {
  try {
    const e = t.config.globalProperties.$router;
    if (!e) return;
    const o = e.afterEach;
    e.afterEach((...n) => {
      q(), typeof o == "function" && o.apply(e, n);
    });
  } catch {
  }
}
function $e() {
  return typeof document < "u" && Dt(), Q();
}
function Ae() {
  return {
    open: _,
    close: S,
    closeAll: q,
    setText: At,
    update: z,
    isLoading: et,
    hasLoading: lt,
    withLoading: G,
    withLoadingOn: st,
    preset: m
  };
}
function Te() {
  const t = [];
  return Yt(), V(() => {
  }), X(() => {
    t.splice(0).forEach((e) => S(e));
  }), {
    open(e) {
      const o = _(e);
      return t.push(o.token), o;
    }
  };
}
function Ee(t) {
  const e = _(t);
  return X(() => S(e.token)), {
    token: e.token,
    close: () => S(e.token),
    /** 组件内部可随时改文案 */
    setText: (o) => z(e.token, { text: o }),
    update: (o) => z(e.token, o)
  };
}
function Pe(t, e) {
  jt(t, e);
}
export {
  we as DIRECTIVE_NAME,
  ve as LoadingHost,
  vt as LoadingMask,
  H as LoadingPreset,
  Le as TransitionLoading,
  nt as buildCtx,
  q as closeAllLoading,
  S as closeLoading,
  $e as createLoading,
  Le as default,
  be as defineLoadingGlobal,
  _e as defineLoadingProperties,
  it as findSlotByToken,
  oe as getDefaultOptions,
  lt as hasLoading,
  Ce as hasLoadingGlobal,
  Pe as install,
  et as isLoading,
  Dt as mountLoadingHost,
  _ as openLoading,
  m as preset,
  Et as presets,
  Ee as scopedLoading,
  Ct as setDefaultOptions,
  At as setLoadingText,
  z as updateLoading,
  Te as useAutoReleaseLoading,
  Ae as useLoading,
  kt as vLoading,
  G as withLoading,
  st as withLoadingOn
};
