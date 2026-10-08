// xl:title 名字逐个取一次：Function.prototype 的成员（缺 2 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why Function.prototype 的成员：取到 undefined（node 上是 number/string）：length / name
// xl:end
const b: any = Function.prototype;
let v = "";
v = "no";
try {
  v = String(typeof b["length"]);
} catch (err) {
}
console.log(typeof b, "length", v);
v = "no";
try {
  v = String(typeof b["name"]);
} catch (err) {
}
console.log(typeof b, "name", v);
console.log("缺", 2, "个名字");
