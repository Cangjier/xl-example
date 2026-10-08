// xl:title 名字逐个取一次：Function.prototype 的成员（缺 2 个）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why `Function.prototype` 自己的 `length`（`0`）与 `name`（`""`）取不到：
//       它在 JS 里**本身就是一个函数对象**（`typeof` 给 `"function"`），所以也该有那两格。
//       **第 690 轮量过、又放回去了**：照 `call` / `apply` 那几格**隐藏挂**上去确实能让
//       这一条转绿，可 `props.xl.md` 里**可调用接收者**取属性的次序是
//       「先自有、再 `protos.Function`、最后才是闭包载荷」，而 `f.length` / `f.name`
//       住在**闭包载荷**上（`Arity` / `Name`，第 291 轮）——原型上多了同名两格就先命中了，
//       于是**每一个函数**的 `name` 变 `""`、`length` 变 `0`：实测 **40 条用例一起红**
//       （`089-function-tostring-and-name`：node `named 2 true` vs 本仓 ` 0 true`）。
//       要收它得先把「闭包载荷那两格」提到 `protos.Function` **之前**判，属于次序那一层的事。
// xl:end
const b: any = Function.prototype;
let v = "";
v = "no";
try {
  v = String(typeof b["length"]);
} catch (err) {
}
console.log(typeof b, "length", v);
v = "no";
try {
  v = String(typeof b["name"]);
} catch (err) {
}
console.log(typeof b, "name", v);
console.log("缺", 2, "个名字");
