// xl:title 名字逐个取一次：Object 的静态成员（缺 2 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why Object 的成员：length 已经装了（第 688 轮），还差 prototype 那一格——
//       node 的 `Object.prototype` 是 object，本仓打出来是 function（函数不是真函数对象，
//       登在 128-function-prototype-layer-gap，同一片）
// xl:end
const b: any = Object;
let v = "";
v = "no";
try {
  v = String(typeof b["length"]);
} catch (err) {
}
console.log(typeof b, "length", v);
v = "no";
try {
  v = String(typeof b["prototype"]);
} catch (err) {
}
console.log(typeof b, "prototype", v);
console.log("缺", 2, "个名字");
