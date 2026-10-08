// xl:title `Symbol.isConcatSpreadable` / `Symbol.unscopables` 两个名字在不在
// xl:round 690
// xl:judge stdout
// xl:why 这两个知名符号与 `RegExp` 无关（一个是 `Array.prototype.concat` 的展开开关、
//       一个是 `with` 的作用域屏蔽表），第 690 轮之前**根本没装**：
//       `typeof Symbol.isConcatSpreadable` 给 `undefined`。
//       它们的**描述**按 JS 的写法给全名（`Symbol.isConcatSpreadable`），
//       而**同一格每次取都是同一个值**（知名符号只造一次）。
// xl:end
console.log(String(typeof (Symbol as any).isConcatSpreadable));
console.log(String(typeof (Symbol as any).unscopables));
console.log(String(Symbol.isConcatSpreadable));
console.log(String(Symbol.unscopables));
console.log(Symbol.isConcatSpreadable === Symbol.isConcatSpreadable);
