// xl:title 名字逐个取一次：Symbol.prototype 的成员（缺 3 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why Symbol.prototype 的成员：取一下直接抛（该成员没装）：constructor / toString / valueOf
// xl:end
const b: any = Symbol.prototype;
let v = "";
v = "no";
try {
  v = String(typeof b["constructor"]);
} catch (err) {
}
console.log(typeof b, "constructor", v);
v = "no";
try {
  v = String(typeof b["toString"]);
} catch (err) {
}
console.log(typeof b, "toString", v);
v = "no";
try {
  v = String(typeof b["valueOf"]);
} catch (err) {
}
console.log(typeof b, "valueOf", v);
console.log("缺", 3, "个名字");
