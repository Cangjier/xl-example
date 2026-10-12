// xl:title `override` 的两副面孔：类成员修饰词 vs 普通变量名
// xl:round 383
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// TS 里 `override` 是**上下文关键字**：只在类成员 / 形参的修饰位上是关键字，
// 而它同时是一个**完全合法的变量名**。两副面孔必须同时成立。
class Base {
  m(): number { return 1; }
  get g(): number { return 10; }
}
class Derived extends Base {
  override m(): number { return 2; }
  override get g(): number { return 20; }
}
console.log("A", new Derived().m(), new Derived().g);
interface Shape2 { override: number; }
const shaped: Shape2 = { override: 5 };
console.log("B", shaped.override);
class Holder {
  override = 7;
}
console.log("C", new Holder().override);
const override = 9;
console.log("D", override + 1, typeof override);
const overrides: Record<string, number> = { k: 3 };
function pick(key: string): number {
  const override = overrides[key];
  if (override && override > 0) return override;
  return -1;
}
console.log("E", pick("k"), pick("nope"));
const table = { override: 11 };
console.log("F", table.override, table["override"]);
