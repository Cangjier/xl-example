// xl:title `JSON` 那两个入口的实参与值：`parse` 先过 `ToString`、`stringify` 的可序列化面
// xl:round 773
// xl:judge stdout
// xl:end
// 第 771 轮登记的 `stdlib/round771/r771b-02` 在这一轮收掉了一半：
// `JSON.parse` 的实参原来**只收字符串**，别的**一律** `SyntaxError`——
// 而 JS 的第一句是 `ToString(text)`（`"1"` 解析出来就是那个数）。
// **符号那一档单独挡**：`String(sym)` 有一条特例（给 `"Symbol(…)"`），
// 而这里要的是 `ToString(sym)`——它在 JS 里抛 `TypeError`。
// **错误只印族名**（措辞是 V8 自己的，与「谁对谁错」无关）。
// **第 809 轮把同判定点的两条并了进来**（原 `r773a-01` 与 `r771b-02`：同一条入口的
// 两个面——`parse` 的实参强制与 `stringify` 的值过滤），第二条的正文接在最下面。
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
console.log('01 parse("1")', show(() => JSON.parse("1")));
console.log('02 parse(1)', show(() => JSON.parse(1 as any)));
console.log('03 parse(1.5)', show(() => JSON.parse(1.5 as any)));
console.log('04 parse(true)', show(() => JSON.parse(true as any)));
console.log('05 parse(null)', show(() => JSON.parse(null as any)));
console.log('06 parse(undefined)', show(() => JSON.parse(undefined as any)));
console.log('07 parse()', show(() => (JSON.parse as any)()));
console.log('08 parse(Symbol())', show(() => JSON.parse(Symbol("s") as any)));
console.log('09 parse({toString})', show(() => JSON.parse({ toString() { return "1"; } } as any)));
console.log('10 parse("nope")', show(() => JSON.parse("nope")));
console.log('11 parse({})', show(() => JSON.parse({} as any)));
console.log('12 stringify(Symbol())', show(() => JSON.stringify(Symbol("s"))));
console.log('13 stringify({a:Symbol()})', show(() => JSON.stringify({ a: Symbol("s") })));
console.log('14 stringify(undefined)', show(() => JSON.stringify(undefined)));
console.log('15 stringify(function(){})', show(() => JSON.stringify(function () { /* 匿名 */ })));
console.log('16 stringify("[1]")', show(() => JSON.stringify("[1]")));
console.log('17 之后的语句照旧', show(() => "after"));
// 原 `r771b-02`（第 771 轮登记、第 773 轮收掉的那条缺口在这一轮当守卫）
console.log('01 JSON.stringify(Symbol(\'s\'))', show(() => JSON.stringify(Symbol('s'))));
console.log('02 JSON.parse(1)', show(() => JSON.parse(1 as any)));
console.log('03 JSON.stringify({ a: undefined })', show(() => JSON.stringify({ a: undefined })));
console.log('04 JSON.stringify(function () {})', show(() => JSON.stringify(function () { /* 匿名 */ })));
