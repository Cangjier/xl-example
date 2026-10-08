// xl:title `new.target` 与 `bind` 出来的构造
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why `new` 一个 `bind` 出来的构造时 `new.target` 该是**原函数**（node 给 `true`），
//       本仓给 `false`——`bind` 造出来的那个可调用对象没有把它自己那一位算进去。
//       `new F()` 那一格是对的，差的只有 bind 这一档。要做。
// xl:end
function F(this: any): any { console.log("target", new.target === F); }
function bare(): void { console.log("bare", new.target === undefined); }
bare();
new (F as any)();
const G: any = (F as any).bind(null);
new G();
