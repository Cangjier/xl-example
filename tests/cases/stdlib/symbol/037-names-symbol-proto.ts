// xl:title 名字逐个取一次：Symbol.prototype 的成员（缺 3 个）
// xl:round 678
// xl:judge stdout
// xl:why **第 754 轮起这一条是「守卫」不再是「缺口」**：`Symbol.prototype` 那一格
// xl:why 第 754 轮造出来了（`Protos.Symbol`，原来连对象都没有 ⇒ 取任何一格
// xl:why 都是**响亮地抛**、整份脚本挂掉）。三个成员仍然没装（`constructor` /
// xl:why `toString` / `valueOf`），所以 Node 给 `function` 的那几行与这里给
// xl:why `undefined` 是**同一件事**：本仓按现状回答、不抛。台账那一行已撤，
// xl:why 用例留着当守卫（成员装上之后这里会红，逼着改）。
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
