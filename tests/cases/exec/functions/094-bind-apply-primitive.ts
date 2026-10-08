// xl:title `call` / `apply` / `bind` 的接收者是原始值时
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why 松散模式里 `call` / `apply` / `bind` 的接收者是**原始值**时要先 `ToObject`
//       装箱（`typeof this` 给 `object`），本仓原样交出原始值。要做。
// xl:end
function f(this: any): void { console.log(typeof this, this === null ? "null" : this === undefined ? "undef" : this.valueOf()); }
f.call(1);
f.apply("a");
f.bind(true)();
f.call(null);
