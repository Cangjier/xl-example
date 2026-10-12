// xl:title `typeof Proxy` 与 `new Proxy`（登记形状）
// xl:round 736
// xl:judge stdout
// xl:want differ
// xl:why `Proxy` / `WeakRef` / `FinalizationRegistry` 三个全局名都没登记（`typeof` 给 `undefined`）。
// xl:why 前两个是**元编程那一层**（第 717 轮的 `Reflect` 只补了「不改变语义的那一半」），
// xl:why `WeakRef` / `FinalizationRegistry` 背后是**GC 的观察者**——本仓的 GC 是标记清除，
// xl:why 没有「这一步收掉了谁」那个时机。三个都**响亮地缺**（不是静默给错值），如实登记。
// xl:end
console.log(typeof (globalThis as any).Proxy, typeof (globalThis as any).WeakRef, typeof (globalThis as any).FinalizationRegistry);
console.log(typeof (globalThis as any).structuredClone, typeof (globalThis as any).queueMicrotask);
