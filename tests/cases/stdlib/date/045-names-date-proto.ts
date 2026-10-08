// xl:title 名字逐个取一次：Date.prototype 的成员（缺 11 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why Date.prototype 的成员：取到 undefined（node 上是 function）：getTimezoneOffset / getYear / setTime / setYear / toDateString / toGMTString / toLocaleDateString / toLocaleString / toLocaleTimeString / toTimeString / toUTCString
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
