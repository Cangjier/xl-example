// xl:title 名字逐个取一次：Promise.prototype 的成员（第 690 轮**三格齐了**）
// xl:round 678
// xl:judge stdout
// xl:why 第 690 轮把 `then` / `catch` / `finally` 补到 `Promise.prototype` 上
//       （JS 里它们**就在原型上**；本仓原来只在每个实例上挂一份，于是原型空着，
//       `Object.create(Promise.prototype).then` 也跟着给 `undefined`）。
//       挂法照 `Function.prototype` 那四格（`MethodObject` + 隐藏挂），形状另立
//       用例 `139-promise-proto-method-shape` 钉住。台账（原来记 `differ`）随之撤掉。
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
