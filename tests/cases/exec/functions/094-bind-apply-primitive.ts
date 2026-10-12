// xl:title `call` / `apply` / `bind` 的接收者是原始值时
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why 第 710 轮把**装箱那一半收掉了**（`call` / `apply` / `bind` 的原始值接收者
//       现在走 `BoxReceiver` 的 `ToObject`）：前四行的 `object 1` / `object a` /
//       `object true` 与 Node 逐字相同。
//       剩下的是**最后一行**：`f.call(null)` 的 `this` 是**全局对象**，而两边
//       `console.log` 它的渲染不同——Node 打整个 `globalThis`（二十多行、带
//       `[Circular *1]` 与一串宿主全局），本仓打 `{}`（全局对象自己的属性在这边
//       **全是不可枚举的**，而宿主那一批接口面根本没装）。与
//       `stdlib/globals/057-names-globalthis` / `console.log` 的循环引用那一族
//       **同一条根**，不是 `this` 那件事了。
// xl:end
function f(this: any): void { console.log(typeof this, this === null ? "null" : this === undefined ? "undef" : this.valueOf()); }
f.call(1);
f.apply("a");
f.bind(true)();
f.call(null);
