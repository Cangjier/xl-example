// xl:title `Promise.prototype` 那三格的**形状**：非枚举、`length` 对得上、`Object.create` 也拿得到
// xl:round 690
// xl:judge stdout
// xl:why 第 690 轮把 `then` / `catch` / `finally` 补到 `Promise.prototype` 上
//       （JS 里它们**就在原型上**）。这一条钉的是**形状**，不是「名字在不在」
//       （那一条是 `121-names-promise-proto`）：三格的 `length` 是 2 / 1 / 1、
//       非枚举（`Object.keys` 还是 `[]`）、`Object.create(Promise.prototype)` 也拿得到。
//       **一处已知差**（写在这里，别去改判据）：本仓**每个实例上还各自挂一份**
//       （`MakePromise`），所以 `Promise.resolve(1).then === Promise.prototype.then`
//       在本仓是 `false`、Node 是 `true`——实例那一份先命中，行为一样，身份不同。
// xl:end
const p: any = Object.create(Promise.prototype);
console.log("chain-then", typeof p.then, typeof p.catch, typeof p.finally);
console.log("lengths", Promise.prototype.then.length, Promise.prototype.catch.length, Promise.prototype.finally.length);
console.log("keys", Object.keys(Promise.prototype).length);
console.log("names", Object.getOwnPropertyNames(Promise.prototype).join(","));
console.log("instance", typeof Promise.resolve(1).then);
