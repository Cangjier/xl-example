// 第 145 轮：**既是对象又可调用**那一档。
//
// `String` / `Number` / `Array` / `Date` 在 JS 里是**函数对象**：`String.fromCharCode` 是
// 对象上的静态方法，`String(1)` 又是调用；`Date.now()` 走属性，`new Date(ms)` 走构造。
// 而本仓原来只有两半里的各一半 —— **宿主引用能被调、对象能带属性，两样都占的没有**。
// 于是 `String(1)` 报 `unimplemented: calling a non-closure value`，
// `new Date(ms)` 只能靠降级层的一条特例（「只有直接写 `Date` 才认」）。
//
// 修法：堆里那一格补上一门**可调用载荷**（`heap.xl.md` 的 `AttachCallable`）——
// 对象照旧是对象（属性、原型、`instanceof` 都不变），只是**多了一格「能被调」**。
// 于是 `Op.Call` 与 `Op.New` 各多一条判据，而降级层那条 `Date` 特例**撤掉了**。
//
// 这一份量的是端到端：`tsrun` 的 stdout 与 `node` 逐字节相同。

// ① 三个「当函数调」的全局名
console.log(String(1), String(true), String(), String(undefined), String(null));
console.log(Number("7"), Number("12px"), Number(""), Number("0x10"), Number(true), Number(null));
console.log(Boolean(0), Boolean(""), Boolean("x"), Boolean());

// ② `typeof` 认它们是函数（而 `Math` 是对象）
console.log(typeof String, typeof Number, typeof Boolean, typeof Array, typeof Date, typeof Math);

// ③ 静态方法那一半照旧（同一个值两种用法）
console.log(String.fromCharCode(65), Number.isInteger(3), Array.isArray([1]));

// ④ 构造：`new Date(ms)` 不再靠降级层特例，别名也对
const Alias = Date;
console.log(new Date(1500).getTime(), new Alias(500).getTime(), new Date(0) instanceof Date);

// ⑤ `new Array(n)`：长度那一档全是**洞**（`0 in a` 为假，与 JS 一致）
const holes = new Array(3);
console.log(holes.length, holes.join("-"), 0 in holes, 2 in holes);
console.log(Array(1, 2).join(","), Array().length, new Array().length);

// ⑥ 「可调用」的口径只有一份：`map` 收 `String` 这种回调
console.log([1, 2, 3].map(String).join("|"));
console.log([10, 9].map(Number).join(","));
console.log([1, 2].filter(Boolean).length);
