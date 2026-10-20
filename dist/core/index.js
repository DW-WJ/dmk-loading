const listenersMap = /* @__PURE__ */ new WeakMap();
const globalListeners = /* @__PURE__ */ new Set();
function listenersOf(target) {
  let set = listenersMap.get(target);
  if (!set) {
    set = /* @__PURE__ */ new Set();
    listenersMap.set(target, set);
  }
  return set;
}
function subscribe(target, fn) {
  if (target === null) {
    globalListeners.add(fn);
    return () => globalListeners.delete(fn);
  }
  const set = listenersOf(target);
  set.add(fn);
  return () => set.delete(fn);
}
function notify$1(target) {
  if (target) listenersOf(target).forEach((fn) => safeCall(fn));
  globalListeners.forEach((fn) => safeCall(fn));
}
function notifyAll(target) {
  if (target) notify$1(target);
  else notify$1(null);
}
function safeCall(fn) {
  try {
    fn();
  } catch (e) {
    if (typeof console !== "undefined") console.warn("[loading-core] 订阅回调异常：", e);
  }
}
function reactive(target) {
  listenersOf(target);
  return target;
}
function isReactive(_v) {
  return false;
}
function readonly(target) {
  return target;
}
function ref(value) {
  return { value };
}
function computed(getter) {
  let cached = getter();
  return {
    get value() {
      return cached;
    },
    // 提供手动失效入口，供适配层在状态变更时调用
    invalidate() {
      cached = getter();
    }
  };
}
function trigger(target) {
  notify$1(target);
}
const DEFAULT_OPTIONS = {
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
  lockScroll: true,
  appendTo: null
};
let seed = 0;
const uid = () => `vtl-${Date.now().toString(36)}-${(seed++).toString(36)}`;
let defaults = { ...DEFAULT_OPTIONS };
function emptyCtx() {
  return { token: "", scope: "global", target: null, options: { ...defaults }, payload: void 0 };
}
function evalValue(value, ctx, fallback) {
  if (value === void 0 || value === null) return fallback;
  if (typeof value === "function") {
    try {
      return value(ctx);
    } catch (e) {
      console.warn("[dmk-loading] 配置函数求值失败，已回退默认值：", e);
      return fallback;
    }
  }
  return value;
}
function mergeOptions(options, base = DEFAULT_OPTIONS, ctx = emptyCtx()) {
  const next = { ...base };
  if (!options) return next;
  const c = { ...ctx, options: next };
  next.text = evalValue(options.text, c, base.text);
  next.textPosition = evalValue(options.textPosition, c, base.textPosition);
  next.spinner = evalValue(options.spinner, c, base.spinner);
  next.transition = evalValue(options.transition, c, base.transition);
  next.maskStyle = evalValue(options.maskStyle, c, base.maskStyle);
  next.color = evalValue(options.color, c, base.color);
  next.textColor = evalValue(options.textColor, c, base.textColor);
  next.maskColor = evalValue(options.maskColor, c, base.maskColor);
  next.size = evalValue(options.size, c, base.size);
  if (options.delay !== void 0) next.delay = options.delay;
  if (options.minDuration !== void 0) next.minDuration = options.minDuration;
  if (options.lockScroll !== void 0) next.lockScroll = options.lockScroll;
  if (options.appendTo !== void 0) next.appendTo = options.appendTo ?? null;
  return next;
}
function setDefaultOptions(options) {
  defaults = mergeOptions(options, defaults, emptyCtx());
}
function getDefaultOptions() {
  return { ...defaults };
}
function resolveOptions(options, base = DEFAULT_OPTIONS) {
  return mergeOptions(options, base, emptyCtx());
}
const state = reactive({
  global: {
    key: "global",
    el: null,
    visible: false,
    options: { ...defaults },
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
function subscribeState(fn) {
  return subscribe(null, fn);
}
function getSnapshot() {
  return state;
}
function getState() {
  return readonly(state);
}
computed(() => state.global.visible);
function isLoading(target) {
  const el = resolveElement(target);
  if (!el) return state.global.visible;
  const slot = findSlot(el);
  return slot ? slot.visible : false;
}
let localSeq = 0;
const elementKeys = /* @__PURE__ */ new WeakMap();
function keyOf(el) {
  let k = elementKeys.get(el);
  if (!k) {
    k = `local-${localSeq++}`;
    elementKeys.set(el, k);
  }
  return k;
}
function resolveElement(target) {
  if (!target) return null;
  if (typeof target === "string") {
    if (typeof document === "undefined") return null;
    const sel = target.trim();
    if (!sel) return null;
    const direct = document.querySelector(sel);
    if (direct) return direct;
    const bare = sel.replace(/^[#.]/, "");
    if (bare !== sel) {
      const byId = document.getElementById(bare);
      if (byId) return byId;
      const byClass = document.querySelector(`.${CSS_escape(bare)}`);
      if (byClass) return byClass;
    } else {
      const byId = document.getElementById(bare);
      if (byId) return byId;
      if (/^[A-Za-z][\w\-:.]*$/.test(bare)) {
        const byHash = document.querySelector(`#${CSS_escape(bare)}`);
        if (byHash) return byHash;
      }
    }
    return null;
  }
  if (target.nodeType === 1) return target;
  const anyTarget = target;
  if (anyTarget.$el && anyTarget.$el.nodeType === 1) return anyTarget.$el;
  if (anyTarget.value !== void 0) return resolveElement(anyTarget.value);
  return null;
}
function CSS_escape(s) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(s);
  return s.replace(/([^\w-])/g, "\\$1");
}
function findSlot(el) {
  const key = keyOf(el);
  return state.locals[key];
}
function findSlotBySelector(selector) {
  const el = resolveElement(selector);
  return el ? findSlot(el) : void 0;
}
const timers = /* @__PURE__ */ new WeakMap();
function getTimers(slot) {
  let t = timers.get(slot);
  if (!t) {
    t = {};
    timers.set(slot, t);
  }
  return t;
}
function clearTimers(slot) {
  const t = timers.get(slot);
  if (!t) return;
  if (t.show) window.clearTimeout(t.show);
  if (t.hide) window.clearTimeout(t.hide);
  timers.set(slot, {});
}
function fireHook(slot, name, arg) {
  var _a;
  const fn = (_a = slot.hooks) == null ? void 0 : _a[name];
  if (typeof fn !== "function") return;
  const ctx = buildCtx(slot);
  try {
    if (name === "onSuccess" || name === "onError") fn(arg, ctx);
    else fn(ctx);
  } catch (e) {
    console.warn(`[dmk-loading] ${name} 钩子执行失败：`, e);
  }
}
function buildCtx(slot) {
  return slot.ctx || {
    token: slot.tokens[slot.tokens.length - 1] || "",
    scope: slot.el ? "local" : "global",
    target: slot.el,
    options: slot.options,
    payload: slot.payload
  };
}
function notify(slot, name, arg) {
  fireHook(slot, name, arg);
}
function scheduleVisible(slot, visible) {
  const t = getTimers(slot);
  if (visible) {
    if (t.show) window.clearTimeout(t.show);
    const delay = slot.options.delay;
    if (delay > 0) {
      t.show = window.setTimeout(() => {
        t.show = void 0;
        slot.visible = true;
        slot.shownAt = performance.now();
        fireHook(slot, "onShow");
        notifyAll();
      }, delay);
    } else {
      slot.visible = true;
      slot.shownAt = performance.now();
      fireHook(slot, "onShow");
      notifyAll();
    }
  } else {
    if (t.show) {
      window.clearTimeout(t.show);
      t.show = void 0;
      return;
    }
    if (t.hide) {
      window.clearTimeout(t.hide);
      t.hide = void 0;
    }
    const finish = () => {
      t.hide = void 0;
      slot.visible = false;
      slot.shownAt = 0;
      fireHook(slot, "onHide");
      notifyAll();
    };
    const min = slot.options.minDuration;
    const elapsed = slot.shownAt ? performance.now() - slot.shownAt : Infinity;
    if (min > 0 && elapsed < min) {
      t.hide = window.setTimeout(finish, min - elapsed);
      return;
    }
    finish();
  }
}
function openLoading(targetOrOptions, maybeOptions) {
  let target = null;
  let options;
  if (typeof targetOrOptions === "string" || targetOrOptions && targetOrOptions.nodeType === 1) {
    target = targetOrOptions;
    options = maybeOptions;
  } else {
    options = targetOrOptions || maybeOptions;
    if (options && typeof options === "object" && typeof options.toOptions === "function") {
      options = options.toOptions();
    }
    if (typeof options === "object" && (options == null ? void 0 : options.target)) {
      target = options.target;
    }
  }
  const token = uid();
  let plan = {};
  if (typeof options === "function") {
    try {
      plan = options({ token, scope: target ? "local" : "global", target, options: { ...defaults } }) || {};
    } catch (e) {
      console.warn("[dmk-loading] 方案工厂执行失败，已使用默认配置：", e);
      plan = {};
    }
    if (!target && plan.target) target = plan.target;
  } else if (options) {
    plan = options;
  }
  const hooksSource = plan;
  const hooks = {
    onShow: hooksSource.onShow,
    onHide: hooksSource.onHide,
    onSuccess: hooksSource.onSuccess,
    onError: hooksSource.onError,
    onFinally: hooksSource.onFinally
  };
  const baseCtx = {
    token,
    scope: target ? "local" : "global",
    target,
    options: { ...defaults },
    payload: plan.payload
  };
  const merged = mergeOptions(plan, defaults, baseCtx);
  const attach = (slot2, el2, key2) => {
    slot2.options = merged;
    slot2.raw = plan;
    slot2.payload = plan.payload;
    slot2.hooks = hooks;
    slot2.ctx = { ...baseCtx, scope: el2 ? "local" : "global", options: merged };
    notifyAll();
    slot2.tokens.push(token);
    state.tokens[token] = key2;
    if (slot2.tokens.length === 1) scheduleVisible(slot2, true);
    else {
      slot2.visible = true;
      notifyAll();
    }
    return { token, key: key2 };
  };
  if (!target) {
    return attach(state.global, null, "global");
  }
  const el = resolveElement(target);
  if (!el) {
    if (typeof console !== "undefined") {
      console.warn("[dmk-loading] 未找到局部遮罩目标，已降级为全局：", target);
    }
    return attach(state.global, null, "global");
  }
  const key = keyOf(el);
  let slot = state.locals[key];
  if (!slot) {
    slot = reactive({
      key,
      el,
      visible: false,
      options: merged,
      tokens: [],
      originPosition: el.style.position || "",
      shownAt: 0,
      raw: plan,
      payload: plan.payload,
      hooks,
      ctx: null
    });
    state.locals[key] = slot;
  }
  return attach(slot, el, key);
}
function closeLoading(targetOrToken) {
  if (targetOrToken === void 0 || targetOrToken === null || typeof targetOrToken === "number") {
    releaseOne("global");
    return;
  }
  if (typeof targetOrToken === "string") {
    if (state.tokens[targetOrToken]) {
      releaseToken(targetOrToken);
      return;
    }
    const slot2 = findSlotBySelector(targetOrToken);
    if (slot2) {
      releaseOne(slot2.key);
      return;
    }
    releaseOne("global");
    return;
  }
  const slot = findSlot(targetOrToken);
  if (slot) {
    releaseOne(slot.key);
    return;
  }
  releaseOne("global");
}
function releaseOne(key) {
  const slot = key === "global" ? state.global : state.locals[key];
  if (!slot || slot.tokens.length === 0) return;
  releaseToken(slot.tokens[slot.tokens.length - 1]);
}
function releaseToken(token) {
  if (!token) return;
  const key = state.tokens[token];
  delete state.tokens[token];
  if (!key) return;
  if (key === "global") {
    const slot2 = state.global;
    const idx2 = slot2.tokens.indexOf(token);
    if (idx2 > -1) slot2.tokens.splice(idx2, 1);
    if (slot2.tokens.length === 0) scheduleVisible(slot2, false);
    return;
  }
  const slot = state.locals[key];
  if (!slot) return;
  const idx = slot.tokens.indexOf(token);
  if (idx > -1) slot.tokens.splice(idx, 1);
  if (slot.tokens.length === 0) {
    scheduleVisible(slot, false);
    window.setTimeout(() => {
      const current = state.locals[key];
      if (current && current.tokens.length === 0) {
        delete state.locals[key];
      }
    }, 400);
  }
}
function closeAllLoading() {
  state.global.tokens.splice(0, state.global.tokens.length);
  clearTimers(state.global);
  state.global.visible = false;
  Object.keys(state.tokens).forEach((t) => delete state.tokens[t]);
  Object.keys(state.locals).forEach((k) => {
    const slot = state.locals[k];
    slot.tokens.splice(0, slot.tokens.length);
    clearTimers(slot);
    slot.visible = false;
    delete state.locals[k];
  });
  notifyAll();
}
function updateLoading(a, b) {
  let token;
  let patch;
  if (typeof a === "string") {
    token = a;
    patch = b;
  } else {
    patch = a;
  }
  const slot = token ? findSlotByToken(token) : state.global;
  if (!slot) return;
  const ctx = buildCtx(slot);
  const incoming = typeof patch === "function" ? patch(ctx) : patch;
  if (!incoming) return;
  slot.options = mergeOptions(incoming, slot.options, ctx);
  slot.raw = { ...slot.raw, ...incoming };
  if (slot.ctx) slot.ctx = { ...slot.ctx, options: slot.options };
  notifyAll();
}
function setLoadingText(text) {
  updateLoading({ text });
}
function hasLoading() {
  if (state.global.visible) return true;
  return Object.values(state.locals).some((s) => s.visible);
}
function localSlots() {
  return Object.values(state.locals);
}
function findSlotByToken(token) {
  const key = state.tokens[token];
  if (!key) return void 0;
  return key === "global" ? state.global : state.locals[key];
}
function isPreset(v) {
  return !!v && typeof v === "object" && typeof v.toOptions === "function";
}
function isHookKey(k) {
  return k === "onShow" || k === "onHide" || k === "onSuccess" || k === "onError" || k === "onFinally";
}
function normalize(input) {
  const out = { options: {}, hooks: {}, target: void 0 };
  if (input === void 0 || input === null) return out;
  if (isPreset(input)) {
    const o = input.toOptions();
    return normalize(o);
  }
  if (typeof input === "function") {
    try {
      const produced = input({
        token: "",
        scope: "global",
        target: null
      });
      if (produced && typeof produced === "object") return normalize(produced);
      if (typeof produced === "string") out.options.text = produced;
    } catch (e) {
      console.warn("[dmk-loading] 方案工厂执行失败，使用默认配置：", e);
    }
    return out;
  }
  const obj = input;
  if ("plan" in obj || "hooks" in obj) {
    const plan = obj.plan;
    if (plan !== void 0 && plan !== null) {
      const inner = normalize(plan);
      Object.assign(out.options, inner.options);
      Object.assign(out.hooks, inner.hooks);
    }
    if (obj.target !== void 0) out.target = obj.target;
    if (obj.hooks && typeof obj.hooks === "object") Object.assign(out.hooks, obj.hooks);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (isHookKey(k)) {
      out.hooks[k] = v;
    } else if (k === "target") {
      out.target = v;
    } else {
      out.options[k] = v;
    }
  }
  return out;
}
function run(task, ctx) {
  if (typeof task !== "function") return task;
  if (task.length === 0) return task();
  return task(ctx);
}
async function execute(task, normalized, opener) {
  const cfg = { ...normalized.options, target: normalized.target, ...normalized.hooks };
  const handle = opener(cfg);
  try {
    const slot = findSlotByToken(handle.token);
    const ctx = slot ? buildCtx(slot) : { token: handle.token };
    const result = await run(task, ctx);
    notifyByToken(handle.token, "onSuccess", result);
    return result;
  } catch (err) {
    notifyByToken(handle.token, "onError", err);
    throw err;
  } finally {
    notifyByToken(handle.token, "onFinally");
    closeLoading(handle.token);
  }
}
async function withLoading(task, options) {
  return execute(task, normalize(options), (cfg) => openLoading(cfg));
}
async function withLoadingOn(target, task, options) {
  if (!resolveElement(target)) {
    return withLoading(task, options);
  }
  const normalized = normalize(options);
  normalized.target = target;
  return execute(task, normalized, (cfg) => openLoading(cfg));
}
function notifyByToken(token, name, arg) {
  const slot = findSlotByToken(token);
  if (slot) notify(slot, name, arg);
}
class LoadingPreset {
  constructor(options = {}, hooks = {}) {
    this.opts = { ...options };
    this.hks = { ...hooks };
  }
  /** 合并配置 */
  with(patch) {
    const resolved = typeof patch === "function" ? patch({}) : patch;
    return new LoadingPreset({ ...this.opts, ...resolved }, this.hks);
  }
  /** 覆盖文案 */
  text(t) {
    return this.with({ text: t });
  }
  /** 指定指示器 */
  spinner(s) {
    return this.with({ spinner: s });
  }
  /** 指定过渡动画 */
  transition(t) {
    return this.with({ transition: t });
  }
  /** 遮罩底色风格 */
  maskStyle(m) {
    return this.with({ maskStyle: m });
  }
  /** 尺寸 */
  size(s) {
    return this.with({ size: s });
  }
  /** 主题色 */
  color(c) {
    return this.with({ color: c });
  }
  /** 文案位置 */
  textPosition(p) {
    return this.with({ textPosition: p });
  }
  /** 出现延迟 */
  delay(ms) {
    return this.with({ delay: ms });
  }
  /** 最短显示时长 */
  minDuration(ms) {
    return this.with({ minDuration: ms });
  }
  /** 指定局部目标，派生新方案 */
  target(t) {
    return this.with({ target: t });
  }
  /** 透传数据，供函数式文案读取 */
  payload(p) {
    return this.with({ payload: p });
  }
  /** 绑定生命周期钩子 */
  hooks(h) {
    return new LoadingPreset(this.opts, { ...this.hks, ...h });
  }
  /** 成功回调 */
  onSuccess(fn) {
    return this.hooks({ onSuccess: fn });
  }
  /** 失败回调 */
  onError(fn) {
    return this.hooks({ onError: fn });
  }
  /** 收尾回调 */
  onFinally(fn) {
    return this.hooks({ onFinally: fn });
  }
  /** 显示回调 */
  onShow(fn) {
    return this.hooks({ onShow: fn });
  }
  /** 隐藏回调 */
  onHide(fn) {
    return this.hooks({ onHide: fn });
  }
  /** 导出为纯配置对象 */
  toOptions() {
    return { ...this.opts, ...this.hks };
  }
  /** 导出为方案工厂函数（延迟求值） */
  toPlan() {
    const snapshot = this.toOptions();
    return () => snapshot;
  }
}
function preset(initial) {
  if (typeof initial === "string") return new LoadingPreset({ text: initial });
  return new LoadingPreset({ ...initial || {} });
}
const presets = {
  /** 快速操作：短延迟、不闪烁 */
  quick: (text = "处理中") => preset(text).delay(0),
  /** 常规请求 */
  normal: (text = "加载中...") => preset(text).delay(120).minDuration(200),
  /** 耗时操作：更长的最短显示，避免闪烁 */
  heavy: (text = "处理中，请稍候") => preset(text).delay(200).minDuration(600).spinner("wave"),
  /** 表格查询：局部常用 */
  table: (text = "查询中") => preset(text).spinner("dots").maskStyle("soft").delay(100),
  /** 表单提交 */
  submit: (text = "提交中") => preset(text).spinner("bars").color("#10b981").delay(0),
  /** 删除等危险操作 */
  danger: (text = "处理中") => preset(text).spinner("pulse").color("#ef4444").delay(0),
  /** 局部区域：卡片等 */
  region: (text = "加载中") => preset(text).spinner("orbit").maskStyle("soft")
};
function buildGlobalApi() {
  return {
    open: openLoading,
    close: closeLoading,
    closeAll: closeAllLoading,
    isLoading,
    hasLoading,
    withLoading,
    withLoadingOn,
    preset,
    presets
  };
}
function defineLoadingGlobal(options = {}) {
  if (typeof window === "undefined") return false;
  const keys = options.keys && options.keys.length ? options.keys : ["$loading"];
  const api = buildGlobalApi();
  let injected = false;
  for (const key of keys) {
    if (!options.overwrite && key in window) continue;
    window[key] = api;
    injected = true;
  }
  return injected;
}
function defineLoadingProperties(app, key = "$loading") {
  app.config.globalProperties[key] = buildGlobalApi();
}
function hasLoadingGlobal(key = "$loading") {
  if (typeof window === "undefined") return false;
  return key in window;
}
function createLoadingCore(render) {
  const renderOnce = () => render(getState());
  renderOnce();
  const unsubscribe = subscribeState(renderOnce);
  return () => {
    unsubscribe();
    closeAllLoading();
  };
}
const core = {
  open: openLoading,
  closeAll: closeAllLoading,
  getState,
  setDefaults: setDefaultOptions
};
export {
  LoadingPreset,
  buildCtx,
  closeAllLoading,
  closeLoading,
  computed,
  core,
  createLoadingCore,
  defineLoadingGlobal,
  defineLoadingProperties,
  findSlotByToken,
  getDefaultOptions,
  getSnapshot,
  getState,
  hasLoading,
  hasLoadingGlobal,
  isLoading,
  isReactive,
  localSlots,
  mergeOptions,
  notify$1 as notify,
  notifyAll,
  openLoading,
  preset,
  presets,
  reactive,
  readonly,
  ref,
  resolveElement,
  resolveOptions,
  setDefaultOptions,
  setLoadingText,
  subscribe,
  subscribeState,
  trigger,
  updateLoading,
  withLoading,
  withLoadingOn
};
