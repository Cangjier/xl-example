// xl:title 名字逐个取一次：Object.prototype 的成员（缺 6 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why Object.prototype 的成员：取到 undefined（node 上是 function/object）：__defineGetter__ / __defineSetter__ / __lookupGetter__ / __lookupSetter__ / __proto__ / toLocaleString
// xl:end
const b: any = Object.prototype;
let v = "";
v = "no";
try {
  v = String(typeof b["__defineGetter__"]);
} catch (err) {
}
console.log(typeof b, "__defineGetter__", v);
v = "no";
try {
  v = String(typeof b["__defineSetter__"]);
} catch (err) {
}
console.log(typeof b, "__defineSetter__", v);
v = "no";
try {
  v = String(typeof b["__lookupGetter__"]);
} catch (err) {
}
console.log(typeof b, "__lookupGetter__", v);
v = "no";
try {
  v = String(typeof b["__lookupSetter__"]);
} catch (err) {
}
console.log(typeof b, "__lookupSetter__", v);
v = "no";
try {
  v = String(typeof b["__proto__"]);
} catch (err) {
}
console.log(typeof b, "__proto__", v);
v = "no";
try {
  v = String(typeof b["toLocaleString"]);
} catch (err) {
}
console.log(typeof b, "toLocaleString", v);
console.log("缺", 6, "个名字");
