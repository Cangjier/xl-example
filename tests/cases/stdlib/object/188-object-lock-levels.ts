// xl:title `freeze` / `seal` / `preventExtensions`：三档锁定与两个问法
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的三十余条**：
//   probe693-o21 · probe693-o22 · probe693-o23 · probe693-o24 · probe693-o25 ·
//   probe694-o16 · probe694-o17 · probe694-o18 · probe694-o31 · probe694-o32 ·
//   probe694-o33 · probe695-o25 · probe695-o26 · probe695-o27 · probe697-f01 ·
//   probe697-f02 · probe697-f03 · probe697-f04 · probe697-f05 · probe697-f06 ·
//   probe697-f16 · probe703-o-a16 · probe703-o-a17 · probe703-o-a18 · probe703-o-a39 ·
//   probe704-o-d30 · probe704-o-d31 · probe704-o-d32 · probe704-o-d33 · probe705-o-b29 ·
//   probe705-o-b30 · probe-j13 · probe-j14
//   ＋ `026-object-freeze-seal-forms` / `040-object-freeze-and-is` / `048-object-preventextensions-forms`
//     / `049-object-issealed-after-preventextensions` / `079-object-freeze-seal-write`
//     / `093-object-frozen-sealed` / `100-object-extensibility` / `148-freeze-semantics`
//
// 判定点只有一个：**三档锁定的层级关系与两个问法的答案**——
//  ① `preventExtensions`：加不上新格，但已有格照改照删、`isSealed` 仍是假；
//  ② `seal`：加不上、删不掉，已有格**还能写**；`isSealed` 真、`isFrozen` 假（可写时）；
//  ③ `freeze`：加不上、删不掉、写不动；`isFrozen` 与 `isSealed` 都真、`isExtensible` 假；
//  ④ 三个问法对**非对象**实参一律给真（`Object.isFrozen(1)` / `isSealed("x")`）；
//  ⑤ 数组也走同一条路（`push` 抛 `TypeError`、`length` 不动）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // ① preventExtensions
  const pe: any = {};
  console.log(show(Object.isExtensible(pe)));
  Object.preventExtensions(pe);
  console.log(show(Object.isExtensible(pe)));
  console.log(show(Object.isSealed(pe)));
  console.log(show(Object.isFrozen(pe)));
  pe.a = 1;
  console.log(show(pe.a));
  // ② seal：能写、不能删、不能加
  const se: any = { a: 1 };
  Object.seal(se);
  console.log(show(Object.isSealed(se) + "," + Object.isFrozen(se)));
  se.a = 2;
  console.log(show(se.a));
  delete se.a;
  console.log(show(se.a));
  se.b = 3;
  console.log(show(se.b));
  // ③ freeze：写不动、删不掉、加不上
  const fr: any = { a: 1 };
  Object.freeze(fr);
  fr.a = 2;
  console.log(show(fr.a));
  console.log(show(Object.isFrozen(fr) + "," + Object.isSealed(fr) + "," + Object.isExtensible(fr)));
  console.log(show(Object.isFrozen(Object.freeze({}))));
  console.log(show(Object.isSealed(Object.seal({}))));
  console.log(show(Object.freeze({ a: 1 }).a));
  console.log(show(Object.is(Object.freeze({ a: 1 }), Object.freeze({ a: 1 }))));
  // 数组那一档
  const ar: any = [1];
  Object.freeze(ar);
  console.log(show(Object.isFrozen(ar)));
  console.log(show(Object.isFrozen(ar) + "," + Object.isExtensible(ar)));
  console.log(show(Object.isFrozen(Object.freeze([1, 2])) + "," + Object.freeze([1, 2]).length));
  try {
    ar.push(2);
    console.log(show("no-throw"));
  } catch (e) {
    console.log(show((e as any).constructor.name));
  }
  // ④ 非对象实参
  console.log(show(Object.isFrozen(1)));
  console.log(show(Object.isSealed("x")));
  // ⑤ 其余两档的问法
  console.log(show(Object.isExtensible({})));
  console.log(show(Object.freeze(Object.create(null)) && "ok"));
  console.log(show(Object.isExtensible(Object.freeze({}))));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
