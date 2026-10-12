// xl:title 名字逐个取一次：Promise 的静态成员（第 690 轮**收掉了最后那一格**）
// xl:round 678
// xl:judge stdout
// xl:why 第 678 轮登记时这里缺 `length`（取到 undefined、node 上是 number）；
//       第 688 轮把内建构造的 `length` 补上之后这条就过了，第 690 轮撤台账——现在两边逐字相同。
// xl:end
const b: any = Promise;
let v = "";
v = "no";
try {
  v = String(typeof b["length"]);
} catch (err) {
}
console.log(typeof b, "length", v);
console.log("缺", 1, "个名字");
