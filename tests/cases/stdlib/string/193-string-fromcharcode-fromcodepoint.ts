// xl:title `fromCharCode` / `fromCodePoint`：码元与码点两个入口
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十二条**：
//   probe-s24 · probe-s25 · probe693-y12 · probe693-y13 · probe696-s23 · probe699-s-e08 ·
//   probe703-s-e19 · probe703-s-e40 · probe705-s-g19 · probe705-s-g20 · probe694-y12（无关那一半）
// 判定点只有一个：**两个静态入口的实参口径**——
//  ① `fromCharCode` 收**码元**（`>0xffff` 会被截成低 16 位，拼不出代理对）；
//  ② `fromCodePoint` 收**码点**（合法范围之外抛 `RangeError`），造出的代理对 `length` 是 2；
//  ③ 两个都能收多个实参并接起来；`fromCharCode()` 无实参给空串。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const anyS: any = String;

try {
  console.log(show(String.fromCharCode(97, 98)));
  console.log(show(String.fromCodePoint(0x41, 0x42)));
  console.log(show(String.fromCharCode(65, 66)));
  console.log(show(String.fromCodePoint(65)));
  console.log(show(String.fromCharCode()));
  console.log(show(String.fromCodePoint(128512)));
  console.log(show(String.fromCodePoint(0x1f600).length));
  // 同一个码位走两个入口：`fromCharCode` 拼代理对要给两个码元才对得上
  console.log(show(String.fromCharCode(0xd83d, 0xde00).length));
  console.log(show(anyS.fromCharCode(0x1f600) === anyS.fromCodePoint(0x1f600)));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
