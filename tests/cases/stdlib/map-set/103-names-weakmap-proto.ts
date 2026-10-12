// xl:title 名字逐个取一次：WeakMap.prototype 的成员（缺 5 个）
// xl:round 678
// xl:judge stdout
// xl:end
const b: any = WeakMap.prototype;
let v = "";
v = "no";
try {
  v = String(typeof b["constructor"]);
} catch (err) {
}
console.log(typeof b, "constructor", v);
v = "no";
try {
  v = String(typeof b["delete"]);
} catch (err) {
}
console.log(typeof b, "delete", v);
v = "no";
try {
  v = String(typeof b["get"]);
} catch (err) {
}
console.log(typeof b, "get", v);
v = "no";
try {
  v = String(typeof b["has"]);
} catch (err) {
}
console.log(typeof b, "has", v);
v = "no";
try {
  v = String(typeof b["set"]);
} catch (err) {
}
console.log(typeof b, "set", v);
console.log("缺", 5, "个名字");
