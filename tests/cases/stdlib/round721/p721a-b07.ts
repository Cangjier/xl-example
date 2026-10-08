// xl:title seal 之后 delete 下标给假、写还是可以
// xl:round 721
// xl:judge stdout
// xl:want differ
// xl:why **`Object.seal` 管不到元素区**：`seal(a)` 把「不可扩展」与属性表里那些格的
// xl:why `configurable: false` 都写上了，可**元素那一摞不在属性表里**——于是 `delete a[1]`
// xl:why 照样成功（Node 给 `false`，那一格还在）。第 721 轮给**下标那一格**补的标志位落点
// xl:why （`IndexKeyShadowOf`）只覆盖「`defineProperty` 显式写了标志位」那一档；
// xl:why `seal` / `freeze` 要的是「把**已有的**元素也照一遍」——那一步还没做。
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.seal(a);
a[1] = 9;
console.log(show(delete a[1]) + "," + show(a[1]) + "," + show(a.length));
