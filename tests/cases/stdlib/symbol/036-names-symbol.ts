// xl:title 名字逐个取一次：Symbol 的静态成员（缺 9 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why Symbol 的静态成员：取到 undefined（node 上是 symbol/number/object）：isConcatSpreadable / length / match / matchAll / prototype / replace / search / split / unscopables
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
