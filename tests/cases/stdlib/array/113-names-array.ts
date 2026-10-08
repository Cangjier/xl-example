// xl:title 名字逐个取一次：Array 的静态成员（缺 1 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why Array 的静态成员：取到 undefined（node 上是 number）：length
// xl:end
const b: any = Array;
let v = "";
v = "no";
try {
  v = String(typeof b["length"]);
} catch (err) {
}
console.log(typeof b, "length", v);
console.log("缺", 1, "个名字");
