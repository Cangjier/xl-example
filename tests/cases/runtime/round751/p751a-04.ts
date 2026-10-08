// xl:title `globalThis` 上那一族宿主名字：`setTimeout` / `process` 等
// xl:round 751
// xl:judge stdout
// xl:want differ
// xl:why **`globalThis` 上那一族宿主名字**：`setTimeout` / `setInterval` / `setImmediate` 与它们的
// xl:why `clear*`、`process` 在本仓**没有那一格**（Node 给 `function` / `object`）。
// xl:why **这一条与 `stdlib/globals/057-names-globalthis`（第 678 轮登记、97 个名字）是同一张账**，
// xl:why 这里只把其中最常写到的两个（`setTimeout` / `process`）单独钉一条——
// xl:why 因为它们是**唯一两个「有语义可做」的**：其余 95 个是宿主面（`fetch` / `crypto` / 流），
// xl:why 而这两个要的是**任务队列那一层**（`setTimeout` 真排一次回调、`process` 至少是个对象）。
// xl:why **补一个假的不如不补**：`setTimeout(f, 0)` 立刻同步跑掉是**静默错值**，比那一格是 `undefined` 难查得多。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log("typeof (globalThis as any)", show(() => typeof (globalThis as any).setTimeout));
console.log("typeof (globalThis as any)", show(() => typeof (globalThis as any).process));
console.log("typeof (globalThis as any)", show(() => typeof (globalThis as any).queueMicrotask));
console.log("typeof (globalThis as any)", show(() => typeof (globalThis as any).structuredClone));
console.log("typeof (globalThis as any)", show(() => typeof (globalThis as any).globalThis));
