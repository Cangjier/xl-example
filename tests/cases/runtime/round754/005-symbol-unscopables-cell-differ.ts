// xl:title `Symbol.unscopables` 那一格（数组的自有屏蔽表）
// xl:round 754
// xl:judge stdout
// xl:note 第 754 轮普查里的一条（期望值由 `node` 现给，打印口径 `typeof:值`）
// xl:want differ
// xl:why 第 2 行 `typeof Array.prototype[Symbol.unscopables]`：Node 给 `"object"`、本仓给 `"undefined"`。
// xl:why **根子**：`Symbol.unscopables` 这个名字**本身**有（第 690 轮补进 `wellKnownNames`），
// xl:why 而 `Array.prototype[Symbol.unscopables]` 那一格**没有人挂**——规范 §23.1.3.41 给它的是
// xl:why 一个**普通对象**，自有键是那十三个被 `with` 屏蔽的数组方法名（`at` / `copyWithin` /
// xl:why `entries` / `fill` / `find` / … 实测 Node 给 13 个键）。
// xl:why **本仓的现状如实写在这里**：`with` 那一族今天连降级都走不顺（`st-with.ts` 那条钉的是
// xl:why 「能进来」），所以这一格**没有消费者**；可它是一个**规范里的值**（与第 690 轮
// xl:why 「名字与协议是两件事」同一条口径），补它只要一句挂表。
// xl:why **为什么这一轮不补**：它是 13 个名字的一张表，而这一轮的时间预算用在
// xl:why 「标签 / 冻结 / 承诺」三处更贵的地方了。**登记，不猜**。
// xl:end
// 本文件是 `p754f-01` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('typeof Symbol.unscopables', show(() => typeof Symbol.unscopables));
console.log('typeof Array.prototype[Symbol.', show(() => typeof Array.prototype[Symbol.unscopables]));
console.log('String(Symbol.unscopables)', show(() => String(Symbol.unscopables)));
console.log('JSON.stringify(Array.prototype', show(() => JSON.stringify(Array.prototype[Symbol.unscopables])));
console.log('Object.keys(Array.prototype[Sy', show(() => Object.keys(Array.prototype[Symbol.unscopables]).join(",")));
console.log('(function () { const withable:', show(() => (function () { const withable: any = { a: 1, b: 2 }; withable[Symbol.unscopables] = { b: true }; return withable.b; })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = { a: 1 }; o[Symbol.unscopables] = { a: true }; return typeof o[Symbol.unscopables]; })()));
