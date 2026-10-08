// xl:title `concat` 展不展一个带 `Symbol.isConcatSpreadable` 的对象
// xl:round 691
// xl:judge stdout
// xl:note 第 760 轮**收掉了**（台账 `xl:want differ` / `xl:why` 按规矩撤掉，用例留着当守卫）：
// xl:note `concat` 原来只认「是不是数组」，于是带那一位的类数组对象被**整个塞进去**、
// xl:note 而标了假的数组**照样被摊平**——两个朝向都是静默错值。现在接收者与实参
// xl:note 走**同一个** `IsConcatSpreadable` 判据（`typescript-exec/builtins/array.xl.md`
// xl:note 的 `ArrayConcat` 那一段），两条支也并成了一条。
// xl:end
const a: any = [1];
const obj: any = { 0: "x", 1: "y", length: 2, [Symbol.isConcatSpreadable]: true };
console.log(JSON.stringify(a.concat(obj)));
const b: any = [2, 3];
b[Symbol.isConcatSpreadable] = false;
console.log(JSON.stringify([1].concat(b)));
console.log(JSON.stringify([1].concat(2, [3, 4])));
