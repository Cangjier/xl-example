// xl:title `split` 的 `limit` / 空分隔符 / 空串源 / 相邻分隔符
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十二条**：
//   probe-s07 · probe3-y07 · probe693-y07 · probe693-y08 · probe693-y09 · probe693-y10 ·
//   probe693-y11 · probe694-y08 · probe694-y09 · probe695-y10 · probe696-s04 · probe696-s06 ·
//   probe699-s-e15 · probe699-s-e42 · probe699-s-e43 · probe703-s-e02 · probe703-s-e28 ·
//   probe704-s-e09 · probe704-s-e10 · probe704-s-e11 · probe705-s-g01 · probe705-s-g11
// 判定点只有一个：**`split` 的分段规则**——
//  ① `limit` 三档：正数截断、`0` 一段都不收、负数当「不限」；
//  ② 空分隔符按**码元**切成一段一个；
//  ③ 空串源：空分隔符给 `[]`、非空分隔符给 `[""]`；
//  ④ 相邻 / 头尾分隔符各自留一个空段。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show("a,b,c".split(",").length));
  console.log(show("a,b".split(",", 1).join("|")));
  console.log(show("a,b".split(",", 0).length));
  console.log(show("a,b".split(",", -1).length));
  console.log(show("abc".split("").join("|")));
  console.log(show("abc".split("", 2).join("|")));
  console.log(show("abc".split("", 2).length));
  console.log(show("abc".split("").length));
  console.log(show("".split(",").length));
  console.log(show("".split("").length));
  console.log(show("a,b,".split(",").length));
  console.log(show("a,b,,c".split(",").length));
  console.log(show("aa".split("a").length));
  console.log(show("abc".split().join("|")));
  console.log(show("abc".split("b").join("|")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
