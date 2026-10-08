// xl:title 名字逐个取一次：Math 的成员（缺 2 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why Math 的成员：取到 undefined（node 上是 function）：f16round / random
// xl:end
const b: any = Math;
let v = "";
v = "no";
try {
  v = String(typeof b["f16round"]);
} catch (err) {
}
console.log(typeof b, "f16round", v);
v = "no";
try {
  v = String(typeof b["random"]);
} catch (err) {
}
console.log(typeof b, "random", v, "(只问名字，不调它)");
console.log("缺", 2, "个名字");
