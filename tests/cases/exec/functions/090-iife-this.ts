// xl:title 非严格里裸调用的 `this` 是全局对象；方法调用是接收者
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why 顶层 `this` 是**模块形态**的差：裁判把 `.ts` 探测成 CJS 之后顶层 `this` 是
//       `module.exports`（对象），本仓的顶层没有那一位。要跟最新 Node 就得先定
//       「这份 `.ts` 是哪种模块」——不是 `this` 那一处能单独修的。
// xl:end
function f(this: any): void { console.log(this === globalThis ? "global" : typeof this); }
f();
const o: any = { m: f };
o.m();
const p: any = { m: () => { console.log("arrow", typeof this); } };
p.m();
