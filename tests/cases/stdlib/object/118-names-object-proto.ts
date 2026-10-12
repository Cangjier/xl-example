// xl:title 名字逐个取一次：Object.prototype 的成员
// xl:round 678
// xl:judge stdout
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
