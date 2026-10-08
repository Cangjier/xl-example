// xl:title 原始值接收者：`setPrototypeOf` / `defineProperty` 该抛的都抛
// xl:round 750
// xl:judge stdout
// xl:want differ
// xl:why **原始值目标该抛 `TypeError`、本仓抛普通 `Error`**：`Object.defineProperty(1, "x", …)` /
// xl:why `Object.setPrototypeOf(1, {})` / `Reflect.defineProperty(1, …)` 在 Node 里都是
// xl:why `TypeError`（判据打出 `throw:TypeError`），本仓给 `throw:Error`——
// xl:why 脚本里 `e instanceof TypeError` 于是分不出来。
// xl:why **不是「该不该抛」的问题**（抛是对的，两边都抛），**是族**：这一族的规范第一步
// xl:why 是 `ToObject`，它对原始值**只抛 `TypeError`**。与第 748 轮收掉的
// xl:why `Object.assign(null, {})` **同一条根**（那一处这一轮已经改成 `TypeError`），
// xl:why 而 `defineProperty` / `setPrototypeOf` / `Reflect` 那几处还抛着普通 `Error`。
// xl:why 收法是把这一族**逐处**换成 `TypeError`（本仓 `globals.xl.md` 里 `throw new TypeError(…)`
// xl:why 第 2858 / 3417 轮各有一处现成的先例）；**逐处**是因为它们的措辞各不相同，
// xl:why 而「换哪几处」要一处一处量——这一轮只量清了四个落点。
// xl:end
const show = (f: () => any) => { try { return "ok:" + String(f()); } catch (e) { return "throw:" + (e as Error).constructor.name; } };
console.log(show(() => Object.setPrototypeOf(1 as any, {} as any)));
console.log(show(() => Object.setPrototypeOf("s" as any, null as any)));
console.log(show(() => Object.defineProperty(1 as any, "x", { value: 1 })));
console.log(show(() => Object.defineProperty("s" as any, "x", { value: 1 })));
console.log(show(() => Object.defineProperty(null as any, "x", { value: 1 })));
console.log(show(() => Reflect.defineProperty(1 as any, "x", { value: 1 })));
