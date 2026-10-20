(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.VTLVitePlugin = {}));
})(this, function(exports2) {
  "use strict";
  var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
  const AUTO_IMPORT_NAMES = [
    "openLoading",
    "closeLoading",
    "closeAllLoading",
    "updateLoading",
    "setLoadingText",
    "isLoading",
    "hasLoading",
    "withLoading",
    "withLoadingOn",
    "setDefaultOptions",
    "getDefaultOptions",
    "preset"
  ];
  const PROJECT_SHADOWS = ["$loading"];
  function shouldSkip(code, id, excludes, libDir) {
    if (!/\.(vue|jsx?|tsx?|mjs)$/.test(id)) return true;
    if (id.includes("node_modules")) return true;
    if (/[\\/]dist[\\/]/.test(id)) return true;
    if (/\.(d\.ts|min\.js)$/.test(id)) return true;
    if (libDir && normalizePath(id).includes(normalizePath(libDir))) return true;
    return excludes.some((re) => re.test(id));
  }
  function baseName(p) {
    return p.replace(/[?#].*$/, "").replace(/\.(ts|tsx|js|jsx|mjs|cjs|vue)$/, "").split("/").pop() ?? "";
  }
  function resolveImports(code, from, id) {
    const sources = [
      ...[...code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]),
      ...[...code.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]),
      // 裸副作用引入：import 'dmk-loading/style.css'
      ...[...code.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
    ];
    if (!sources.length) return false;
    const fromBase = baseName(from);
    const libPkg = "dmk-loading";
    for (const src of sources) {
      if (src === from) return true;
      if (src === libPkg || src.startsWith(`${libPkg}/`)) return true;
      if (normalizePath(src) === normalizePath(from)) return true;
      if (fromBase && baseName(src) === fromBase) return true;
    }
    return false;
  }
  function normalizePath(p) {
    const clean = p.replace(/[?#].*$/, "").replace(/\.(ts|tsx|js|jsx|mjs|cjs|vue)$/, "");
    const abs = clean.startsWith("/") ? clean : `/${clean}`;
    const parts = [];
    for (const seg of abs.split("/")) {
      if (seg === "." || seg === "") continue;
      if (seg === "..") {
        parts.pop();
        continue;
      }
      parts.push(seg);
    }
    return parts.join("/");
  }
  function TransitionLoadingAutoImport(options = {}) {
    const names = options.names ?? [...AUTO_IMPORT_NAMES];
    const from = options.from ?? "dmk-loading";
    const windowKey = options.windowKey ?? "$loading";
    const excludes = (options.exclude ?? []).map((e) => new RegExp(e));
    const libDir = options.libDir ?? dirnameFromUrl(typeof document === "undefined" && typeof location === "undefined" ? require("url").pathToFileURL(__filename).href : typeof document === "undefined" ? location.href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("vite.umd.cjs", document.baseURI).href);
    const transformCode = (code, id) => {
      if (shouldSkip(code, id, excludes, libDir)) return null;
      if (!names.some((n) => code.includes(n))) return null;
      const alreadyImported = resolveImports(code, from);
      const usedNames = names.filter((n) => {
        if (!code.includes(n)) return false;
        return new RegExp(`\\b${n}\\s*\\(`).test(code) || // 作为参数传递：withLoading: xxx / { onSuccess: openLoading }
        new RegExp(`[:\\[,]\\s*${n}\\b`).test(code);
      });
      if (!usedNames.length) return null;
      if (alreadyImported) return null;
      const missing = [];
      for (const name of usedNames) {
        if (PROJECT_SHADOWS.includes(name)) continue;
        const declared = new RegExp(
          `(?:const|let|var|function|class)\\s+${name}\\b`,
          "m"
        ).test(code);
        if (declared) continue;
        missing.push(name);
      }
      if (!missing.length) return null;
      const parts = [`import { ${missing.join(", ")} } from '${from}';`];
      if (options.injectWindow) {
        parts.push(
          `import { defineLoadingGlobal as __vtlDefineGlobal } from '${from}';`,
          `__vtlDefineGlobal({ keys: ['${windowKey}'], overwrite: false });`
        );
      }
      const shebang = code.startsWith("#!") ? `${code.slice(0, code.indexOf("\n") + 1)}
` : "";
      const body = shebang ? code.slice(shebang.length) : code;
      return `${shebang}${parts.join("\n")}
${body}`;
    };
    return {
      name: "dmk-loading:auto-import",
      // 关键：必须排在 @vitejs/plugin-vue 之后。
      //   enforce:'pre'  时拿到的是**原始 SFC**，注入到 <script> 标签外的位置会被 Vue 编译器丢弃。
      //   post 阶段拿到的是 vue 已经编译好的 JS，注入的 import 才是有效顶层语句。
      //   对 .ts/.js 而言 post 与 pre 行为一致，所以统一用 post。
      enforce: "post",
      transform(code, id) {
        const out = transformCode(code, id);
        return out === null ? null : { code: out, map: null };
      },
      transformCode
    };
  }
  function dirnameFromUrl(url) {
    const m = url.match(/^file:\/\/\/(.*)$/);
    const path = m ? m[1] : url.replace(/^[a-z]+:\/\/[^/]*/, "");
    const dir = path.slice(0, path.lastIndexOf("/") + 1);
    try {
      return decodeURIComponent(dir);
    } catch {
      return dir;
    }
  }
  exports2.AUTO_IMPORT_NAMES = AUTO_IMPORT_NAMES;
  exports2.TransitionLoadingAutoImport = TransitionLoadingAutoImport;
  exports2.default = TransitionLoadingAutoImport;
  Object.defineProperties(exports2, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
});
