// xl:title `console` 的 `Console` 那一格与 `globalThis` 上的名字
// xl:round 751
// xl:judge stdout
// xl:want differ
// xl:why **`console.Console` 那一格**：Node 的 `console` 是一个 `Console` **实例**，构造函数挂在实例上
// xl:why （`console.Console === Console`），而本仓的 `console` 是一个**普通对象**（方法直接挂在它身上）⇒ 那一格 `undefined`。
// xl:why **它与 `stdlib/console/020-names-console` 是同一条账**（第 733 轮量的是同一个面），
// xl:why 这一条只补上「`globalThis.console` 是 `object`、`console.Console` 是 `function`」两句。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log("typeof (globalThis as any)", show(() => typeof (globalThis as any).console));
console.log("typeof (console as any).Co", show(() => typeof (console as any).Console));
