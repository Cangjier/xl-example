// xl:title 名字逐个取一次：Promise.prototype 的成员（缺 3 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why Promise.prototype 的成员：取到 undefined（node 上是 function）：catch / finally / then
// xl:end
const b: any = Promise.prototype;
let v = "";
v = "no";
try {
  v = String(typeof b["catch"]);
} catch (err) {
}
console.log(typeof b, "catch", v);
v = "no";
try {
  v = String(typeof b["finally"]);
} catch (err) {
}
console.log(typeof b, "finally", v);
v = "no";
try {
  v = String(typeof b["then"]);
} catch (err) {
}
console.log(typeof b, "then", v);
console.log("缺", 3, "个名字");
