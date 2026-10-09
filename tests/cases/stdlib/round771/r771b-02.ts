// xl:title `JSON` 那两个入口的实参与值（第 773 轮收掉，这里当守卫）
// xl:round 771
// xl:judge stdout
// xl:end
// **第 771 轮登记的那条缺口在第 773 轮收掉了**（`globals.xl.md` 的 `JsonParse`：
// 实参先过 `ToString`——`JSON.parse(1)` 给 `1`），`xl:want differ` / `xl:why` 按规矩撤掉，
// 这一条留着当守卫。
//
// **原来第 1 行量到的「`JSON.stringify(Symbol())` 抛 TypeError」不是 JSON 那一格的根**：
// 那一句写成 `(JSON.stringify as any)(Symbol('s'))`，而**括号被调者那一格**会把
// 被调者与实参整段对调（第 773 轮量清，见 `stdlib/round773/r773b-01`）——
// 换成方法形态之后两边一字不差（这一条的第 1 行就是它）。
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
console.log('01 JSON.stringify(Symbol(\'s\'))', show(() => JSON.stringify(Symbol('s'))));
console.log('02 JSON.parse(1)', show(() => JSON.parse(1 as any)));
console.log('03 JSON.stringify({ a: undefined })', show(() => JSON.stringify({ a: undefined })));
console.log('04 JSON.stringify(function () {})', show(() => JSON.stringify(function () { /* 匿名 */ })));
