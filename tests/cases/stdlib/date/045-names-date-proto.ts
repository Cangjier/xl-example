// xl:title 名字逐个取一次：Date.prototype 的成员（缺 6 个）
// xl:round 702
// xl:judge stdout
// xl:want differ
// xl:why Date.prototype 的成员：取到 undefined（node 上是 function）：toDateString / toLocaleDateString / toLocaleString / toLocaleTimeString / toTimeString
//       第 702 轮收掉五个（getTimezoneOffset / getYear / setTime / setYear / toGMTString / toUTCString）——
//       剩下的这五个都要**本地时区那一支渲染**：`toDateString` 要星期与月份的英文名 +
//       本地墙上时间、`toLocaleXxx` 三格要**一张区域表**（`2020/1/2 11:04:05` 是 ICU 给的形状），
//       而本仓的本地口径就是 UTC（`InstallDateMethods` 那一段），拿它渲染那几格就是**答一个错的**。
// xl:end
const b: any = Date.prototype;
let v = "";
v = "no";
try {
  v = String(typeof b["getTimezoneOffset"]);
} catch (err) {
}
console.log(typeof b, "getTimezoneOffset", v);
v = "no";
try {
  v = String(typeof b["getYear"]);
} catch (err) {
}
console.log(typeof b, "getYear", v);
v = "no";
try {
  v = String(typeof b["setTime"]);
} catch (err) {
}
console.log(typeof b, "setTime", v);
v = "no";
try {
  v = String(typeof b["setYear"]);
} catch (err) {
}
console.log(typeof b, "setYear", v);
v = "no";
try {
  v = String(typeof b["toDateString"]);
} catch (err) {
}
console.log(typeof b, "toDateString", v);
v = "no";
try {
  v = String(typeof b["toGMTString"]);
} catch (err) {
}
console.log(typeof b, "toGMTString", v);
v = "no";
try {
  v = String(typeof b["toLocaleDateString"]);
} catch (err) {
}
console.log(typeof b, "toLocaleDateString", v);
v = "no";
try {
  v = String(typeof b["toLocaleString"]);
} catch (err) {
}
console.log(typeof b, "toLocaleString", v);
v = "no";
try {
  v = String(typeof b["toLocaleTimeString"]);
} catch (err) {
}
console.log(typeof b, "toLocaleTimeString", v);
v = "no";
try {
  v = String(typeof b["toTimeString"]);
} catch (err) {
}
console.log(typeof b, "toTimeString", v);
v = "no";
try {
  v = String(typeof b["toUTCString"]);
} catch (err) {
}
console.log(typeof b, "toUTCString", v);
console.log("缺", 11, "个名字");
