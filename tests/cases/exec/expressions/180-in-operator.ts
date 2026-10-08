// xl:title `in` 查的是整条原型链
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why `in` 的右操作数不是对象时该在**运行期**抛 `TypeError`（`try` 接得住），
//       本仓在**降级那一步**就报 `unimplemented: 'in' needs an object on the right`
//       ⇒ 整份文件跑不起来、`catch` 根本没机会执行。要做。
// xl:end
const o: any = Object.create({ p: 1 });
o.a = 2;
console.log("a" in o, "p" in o, "z" in o, "toString" in o);
console.log("toString" in Object.create(null));
try { "a" in (1 as any); } catch (e: any) { console.log("prim", e.constructor.name); }
