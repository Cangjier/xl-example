// xl:title 迭代器的标签：数组 / `Map` / `Set` 三族的 `Object.prototype.toString`
// xl:round 751
// xl:judge stdout
// xl:want differ
// xl:why **数组 / `Map` / `Set` 三种迭代器的标签都少一层**：`Object.prototype.toString.call` 在 Node 里给
// xl:why `[object Array Iterator]` / `[object Map Iterator]` / `[object Set Iterator]`，本仓三格都给
// xl:why `[object Array]`——因为**本仓的迭代器就是一个数组**（`AttachArrayIterator` 那一趟只挂了
// xl:why `__i` / `next` / 三个助手，**没挂 `Symbol.toStringTag`**）。
// xl:why **修法要穿过三份文件**：那一格是**语言层**的符号（`protos.WellKnownSymbols` 那张小表），
// xl:why 而 `AttachArrayIterator` 的签名里**没有 `protos`**（`array.xl.md` 里那个方法被 `Map` / `Set`
// xl:why 两处调用点共用）——给它加一格标签名参数、或给引擎添一格「按名写标签」的钩子，两条都要动装配。
// xl:why **别把 `value.Tag === Array` 那一句去掉**（真数组就该给 `[object Array]`）：差的是**迭代器那一档**。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log("Object.prototype.toString.", show(() => Object.prototype.toString.call([1,2].keys())));
console.log("Object.prototype.toString.", show(() => Object.prototype.toString.call([1,2].values())));
console.log("Object.prototype.toString.", show(() => Object.prototype.toString.call(new Map([[1,2]]).keys())));
console.log("Object.prototype.toString.", show(() => Object.prototype.toString.call(new Set([1]).values())));
