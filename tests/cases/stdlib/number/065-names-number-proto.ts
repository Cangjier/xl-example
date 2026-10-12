// xl:title 名字逐个取一次：Number.prototype 的成员（第 690 轮**收掉了最后那一格**）
// xl:round 678
// xl:judge stdout
// xl:why 第 678 轮登记时这里缺 `toLocaleString`（取到 undefined、node 上是 function）；
//       后来那一格装上了，第 690 轮把台账撤掉——现在两边逐字相同。
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
