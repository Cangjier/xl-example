// xl:title `concat` 展不展一个带 `Symbol.isConcatSpreadable` 的对象
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why `concat` **认不认 `Symbol.isConcatSpreadable`**：JS 里它决定「展开还是当一个元素」，
//       本仓只认「是不是数组」⇒ 一个带那一位的类数组对象被**整个塞进去**
//       （Node 给 `[1,"x","y"]`、本仓给 `[1,{...}]`）。要做。
// xl:end
const a: any = [1];
const obj: any = { 0: "x", 1: "y", length: 2, [Symbol.isConcatSpreadable]: true };
console.log(JSON.stringify(a.concat(obj)));
const b: any = [2, 3];
b[Symbol.isConcatSpreadable] = false;
console.log(JSON.stringify([1].concat(b)));
console.log(JSON.stringify([1].concat(2, [3, 4])));
