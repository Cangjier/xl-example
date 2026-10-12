// xl:title 名字逐个取一次：JSON 的成员（缺 2 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why JSON 的成员：取到 undefined（node 上是 function）：isRawJSON / rawJSON
// xl:end
const b: any = JSON;
let v = "";
v = "no";
try {
  v = String(typeof b["isRawJSON"]);
} catch (err) {
}
console.log(typeof b, "isRawJSON", v);
v = "no";
try {
  v = String(typeof b["rawJSON"]);
} catch (err) {
}
console.log(typeof b, "rawJSON", v);
console.log("缺", 2, "个名字");
