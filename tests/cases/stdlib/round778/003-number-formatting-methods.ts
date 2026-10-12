// xl:title Number 的格式化：toFixed / toExponential / toPrecision 与四舍五入那一档
// xl:round 778
// xl:judge stdout
// xl:end
// 第 778 轮普查面：数字的格式化三兄弟。判据全落在**整数位可预期**的取值上
// （1.005 那种二进制表示误差两边都不一样的话就不算判据），另钉范围校验与 NaN/Infinity。
const show = (v: any): string => (typeof v === "string" ? JSON.stringify(v) : String(v));
const call = (f: () => any): string => { try { return show(f()); } catch (e: any) { return "throw:" + e.constructor.name; } };
console.log('01 toFixed(0)', show((1.4).toFixed(0)));
console.log('02 toFixed 进位', show((1.5).toFixed(0)));
console.log('03 toFixed 负数', show((-1.5).toFixed(0)));
console.log('04 toFixed(2)', show((2.345).toFixed(2)));
console.log('05 toFixed 补零', show((1).toFixed(3)));
console.log('06 toFixed 范围校验', call(() => (1).toFixed(101)));
console.log('07 toFixed 负数位', call(() => (1).toFixed(-1)));
console.log('08 toFixed(NaN)', show(NaN.toFixed(2)));
console.log('09 toFixed(Infinity)', show(Infinity.toFixed(2)));
console.log('10 大数不吃指数', show((1e21).toFixed(2)));
console.log('11 toExponential()', show((123.456).toExponential()));
console.log('12 toExponential(2)', show((123.456).toExponential(2)));
console.log('13 toExponential(0)', show((123.456).toExponential(0)));
console.log('14 toExponential 范围', call(() => (1).toExponential(101)));
console.log('15 toExponential(0) 于 0', show((0).toExponential(0)));
console.log('16 toPrecision(4)', show((123.456).toPrecision(4)));
console.log('17 toPrecision(2) 带指数', show((123.456).toPrecision(2)));
console.log('18 toPrecision(1)', show((0.000123).toPrecision(1)));
console.log('19 toPrecision 范围', call(() => (1).toPrecision(0)));
console.log('20 toString(2)', show((10).toString(2)));
console.log('21 toString(36)', show((35).toString(36)));
console.log('22 toString 非法进制', call(() => (10).toString(1)));
console.log('23 toString 小数进制', show((255).toString(16.5 as any)));
console.log('24 负零', show((-0).toFixed(1)) + " " + show(String(-0)));
