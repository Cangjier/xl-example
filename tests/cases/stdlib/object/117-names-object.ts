// xl:title 名字逐个取一次：Object 的静态成员（缺 2 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why Object 的静态成员：取到 undefined（node 上是 number/object）：length / prototype
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
