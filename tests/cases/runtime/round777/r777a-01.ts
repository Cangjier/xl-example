// xl:title 原始值上的**下标读**与点号读是同一件事
// xl:round 777
// xl:judge stdout
// xl:end
// 第 777 轮收掉的那一处根：`vm.xl.md` 的 `get_index` 里有一句
// 「不是对象就给 `undefined`」的早退 —— 于是 `n["toFixed"]` 给 `undefined`，
// 而**同一格的 `n.toFixed`** 是好的（点号那一路无条件交给 `GetProperty`，它自己会装箱）。
// JS 里两者是同一件事（先 `ToObject` 再沿原型找），所以那一句是**多出来的**。
// 这一条把数字 / 布尔 / 字符串三档的下标读与点号读**逐一对照**，另钉两条边界
// （不存在的键照旧 `undefined`、符号那一档不在本次改动里）。
const show = (v: any): string => (typeof v === "string" ? JSON.stringify(v) : String(v));
console.log('01 数字：下标读与点号读是同一格', show((5 as any)["toFixed"] === (5 as any).toFixed));
console.log('02 数字：取到的就是原型上那一个', show((5 as any)["toFixed"] === Number.prototype.toFixed));
console.log('03 数字：下标读出来的还能调', show((5 as any)["toFixed"](2)));
console.log('04 数字：点号读照旧', show((5 as any).toFixed(2)));
console.log('05 数字：constructor 那一格', show((5 as any)["constructor"] === Number));
console.log('06 数字：进制转换', show((255 as any)["toString"](16)));
console.log('07 布尔：下标读', show((true as any)["valueOf"] === Boolean.prototype.valueOf));
console.log('08 布尔：下标读出来还能调', show((true as any)["toString"]()));
console.log('09 字符串：下标读照旧（这一档本来就对）', show("ab"["toUpperCase"] === String.prototype.toUpperCase));
console.log('10 字符串：length 仍是下标位那一格', show("ab"["length"]));
console.log('11 字符串：越界下标', show(typeof "ab"[9]));
console.log('12 数字：不存在的键照旧 undefined', show(typeof (5 as any)["nope"]));
console.log('13 数字：数值下标不是属性', show(typeof (5 as any)[0]));
console.log('14 对象那一档不许被带偏', show(({ m() { return 14; } })["m"]()));
console.log('15 数组那一档不许被带偏', show([1, 2, 3]["length"] + ":" + [1, 2, 3][1]));
console.log('16 变量接收者（同一格）', show((() => { const n: any = 5; return n["toFixed"] === Number.prototype.toFixed; })()));
console.log('17 计算出来的键', show((() => { const k: any = "toFixed"; return (5 as any)[k] === Number.prototype.toFixed; })()));
console.log('18 原始值上写属性仍是静默', show((() => { const s: any = "abc"; s.x = 1; return String(s.x); })()));
