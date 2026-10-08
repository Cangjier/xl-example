// xl:title 名字逐个取一次：Number.prototype 的成员（缺 1 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why Number.prototype 的成员：取到 undefined（node 上是 function）：toLocaleString
// xl:end
const b: any = Number.prototype;
let v = "";
v = "no";
try {
  v = String(typeof b["toLocaleString"]);
} catch (err) {
}
console.log(typeof b, "toLocaleString", v);
console.log("缺", 1, "个名字");
