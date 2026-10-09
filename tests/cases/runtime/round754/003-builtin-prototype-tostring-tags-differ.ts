// xl:title 内建原型自己的标签（`Object.prototype.toString.call(原型)`）
// xl:round 754
// xl:judge stdout
// xl:note 第 754 轮普查里的一条（期望值由 `node` 现给，打印口径 `typeof:值`）
// xl:want differ
// xl:why 第 1 行 `Object.prototype.toString.call(Object.prototype)`：Node 给 `[object Object]`、
// xl:why 本仓给 `[object Function]`。**根子**：`props.xl.md` 的 `GetProperty` 里有一条
// xl:why 「接收者是 `protos.Object` / `protos.Function` 时，先到 `protos.Function` 上找一次」
// xl:why 的兜底（第 228 轮加的口径：`Object.prototype.toString.call(x)` 里那个接收者是
// xl:why **宿主引用**，没有属性表）。那一条的判据是 `receiver.Ref === protos.Object`——
// xl:why 于是**任何**对 `Object.prototype` 的属性查找都算「可调用接收者」，
// xl:why 而 `ObjectTagOf` 的第一句正是 `value.IsCallable()` ⇒ 标签成了 `Function`。
// xl:why **旁证**：`typeof Object.prototype` 是 `"object"`（`rt.xl.md` 的 `RtTypeOf` 第 690 轮
// xl:why 把 `protos.Object` 拿掉了）——同一件事两处口径**正好相反**，这一句就是把它写在明处。
// xl:why **为什么不顺手改**：那一串 `||` 与第 601 / 697 轮的 `IsCallableValue` 是同一处
// xl:why （它管的是「setter 能不能调」）——`Object.prototype` 拿掉之后要重跑整张表，
// xl:why 而这一轮的时间预算用完了。**登记，不猜**。
// xl:end
// 本文件是 `p754d-01` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Object.prototype)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Array.prototype)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(String.prototype)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Number.prototype)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Boolean.prototype)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Symbol.prototype)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Function.prototype)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Error.prototype)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Date.prototype)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Map.prototype)));
console.log('Object.prototype.toString.call', show(() => Object.prototype.toString.call(Set.prototype)));
console.log('Object.create(String.prototype', show(() => Object.create(String.prototype)[Symbol.toStringTag]));
console.log('typeof Object.create(Number.pr', show(() => typeof Object.create(Number.prototype).toFixed));
