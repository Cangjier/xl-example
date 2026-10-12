// xl:title `Symbol` 的注册表与知名符号那一族
// xl:round 767
// xl:judge stdout
// xl:note `Symbol.for` 那张**跨调用共享**的注册表（同一个键给同一个符号、`Symbol.keyFor` 反查）、
// xl:note `Symbol(键)` **不进注册表**（`keyFor` 给 `undefined`）、`description` 两种来源。
// xl:note 知名符号那一族逐个点一次（缺一个就是 `undefined`，而 `Symbol.iterator` 那种
// xl:note 缺了会让 `for..of` 整族换一条路——所以这一条是守卫）。
// xl:end
const a = Symbol.for("k");
const b = Symbol.for("k");
console.log("01", a === b, Symbol.keyFor(a), a.description, Symbol("k").description);
console.log("02", typeof Symbol.iterator, typeof Symbol.asyncIterator, typeof Symbol.toPrimitive, typeof Symbol.toStringTag);
console.log("03", Symbol.keyFor(Symbol("x")));
const names = ["iterator", "asyncIterator", "hasInstance", "isConcatSpreadable", "match", "matchAll", "replace", "search", "species", "split", "toPrimitive", "toStringTag", "unscopables"];
console.log("04", names.filter((n) => typeof (Symbol as any)[n] !== "symbol").join(",") || "none");
console.log("05", typeof a, a.toString(), String(a).length > 0);
