// xl:title 名字逐个取一次：Symbol 的静态成员（第 690 轮只剩 `prototype` 一格）
// xl:round 678
// xl:judge stdout
// xl:why 第 678 轮登记时缺九格，第 690 轮补掉了八格：七个知名符号
//       （`isConcatSpreadable` / `unscopables` / `match` / `replace` / `search` /
//       `split` / `matchAll` 与 `length`——后两个在 `length` 那一行量的是 `number`）。
//       **第 754 轮把最后一格也补上了**：`Symbol.prototype` 现在是一个对象
//       （`Protos.Symbol`，`globals.xl.md` 的 `symbolObject` 上挂着这一格），
//       所以 `typeof (Symbol as any).prototype` 与 Node 一样给 `"object"`。
//       台账那一行已撤，用例留着当守卫（成员装上之后这里会红，逼着改）。
// xl:end
const b: any = Symbol;
let v = "";
v = "no";
try {
  v = String(typeof b["isConcatSpreadable"]);
} catch (err) {
}
console.log(typeof b, "isConcatSpreadable", v);
v = "no";
try {
  v = String(typeof b["length"]);
} catch (err) {
}
console.log(typeof b, "length", v);
v = "no";
try {
  v = String(typeof b["match"]);
} catch (err) {
}
console.log(typeof b, "match", v);
v = "no";
try {
  v = String(typeof b["matchAll"]);
} catch (err) {
}
console.log(typeof b, "matchAll", v);
v = "no";
try {
  v = String(typeof b["prototype"]);
} catch (err) {
}
console.log(typeof b, "prototype", v);
v = "no";
try {
  v = String(typeof b["replace"]);
} catch (err) {
}
console.log(typeof b, "replace", v);
v = "no";
try {
  v = String(typeof b["search"]);
} catch (err) {
}
console.log(typeof b, "search", v);
v = "no";
try {
  v = String(typeof b["split"]);
} catch (err) {
}
console.log(typeof b, "split", v);
v = "no";
try {
  v = String(typeof b["unscopables"]);
} catch (err) {
}
console.log(typeof b, "unscopables", v);
console.log("缺", 9, "个名字");
