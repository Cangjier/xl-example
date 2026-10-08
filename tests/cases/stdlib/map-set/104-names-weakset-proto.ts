// xl:title 名字逐个取一次：WeakSet.prototype 的成员（缺 4 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why WeakSet.prototype 的成员：取一下直接抛（该成员没装）：add / constructor / delete / has
// xl:end
const b: any = WeakSet.prototype;
let v = "";
v = "no";
try {
  v = String(typeof b["add"]);
} catch (err) {
}
console.log(typeof b, "add", v);
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
  v = String(typeof b["has"]);
} catch (err) {
}
console.log(typeof b, "has", v);
console.log("缺", 4, "个名字");
