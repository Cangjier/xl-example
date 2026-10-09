// xl:title 渲染：环 / 深度 / 符号键 / 不可枚举
// xl:round 748
// xl:judge stdout
// xl:want differ
// xl:why `console.log` 打**自引用**对象：Node 给 `<ref *1> { a: 1, self: [Circular *1] }`
// xl:why （深度优先、第一处重复**打标记**并为它编号），本仓给
// xl:why `{ a: 1, self: { a: 1, self: { a: 1, self: [Object] } } }`——**先展开三层再截断**，
// xl:why 既没有 `<ref *N>` 标记、也没有 `[Circular *N]` 那一格。
// xl:why 根在 `inspect.xl.md` 的深度那一趟：它按**深度**截断（`[Object]`），
// xl:why 而 Node 的 `util.inspect` 是按**已见过的引用**截断（同一个对象第二次出现就是环）。
// xl:why **这一格纯属渲染口径**（值本身是对的）：`o.self.self === o` 两边一样为真。
// xl:end
// 本文件是 `p748a-a11` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

const o: any = { a: 1 };
o.self = o;
console.log(o);
console.log([[[[[1]]]]]);
const deep: any = { l1: { l2: { l3: { l4: { l5: 1 } } } } };
console.log(deep);
const sym = Symbol("s");
const withSym: any = { [sym]: 1, b: 2 };
console.log(withSym, Object.keys(withSym).join(","));
console.log(Object.getOwnPropertyNames(withSym).join(","));
