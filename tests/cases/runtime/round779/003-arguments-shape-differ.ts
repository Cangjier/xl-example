// xl:title `arguments` 的形状：它不是数组
// xl:round 779
// xl:judge stdout
// xl:want differ
// xl:why 本仓的 `arguments` **值就是一个数组**（`vm.xl.md` 第 702 轮的有意取舍：为了 `arguments[0]` / `.length` / 展开那一整片已经对的东西，只在它身上挂一格 `__a` 标记），于是**四个面**与 JS 不同：`typeof arguments.map` 本仓给 `"function"`（Node 给 `"undefined"`——它不是 `Array.prototype` 的实例）、`Object.getPrototypeOf(arguments) === Object.prototype` 本仓给假、`arguments.hasOwnProperty("length")` 本仓给假（那一格是元素区的结构属性）、自有名表里多一格内部的 `__a`。**同一份用例里其余九档全对**（length / 下标 / `Array.isArray` 为假 / `Symbol.iterator` 展开 / `slice.call` / `callee` / `typeof` / 标签），收的时候不许连累它们。**为什么不顺手收**：`IsArgumentsValue` 是在 `Array.isArray` / `Object.prototype.toString` / `inspect` 三处**特判**出来的，真要改就得把 `arguments` 造成另一种值模型（牵动整片已经对的东西）——先如实登记。
// xl:end
const S = (v: any): string => {
  try {
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "function") return "fn:" + v.name;
    if (v === undefined) return "undefined";
    if (v !== null && typeof v === "object" && !Array.isArray(v)) return JSON.stringify(v);
    return String(v);
  } catch (e) { return "<unprintable>"; }
};
const t = (label: string, f: () => any) => {
  try { console.log(label + " = " + S(f())); }
  catch (e) { console.log(label + " ! " + ((e as any) && (e as any).constructor ? (e as any).constructor.name : "?")); }
};
const NL = (label: string, f: any) => t(label, () => f.name + "/" + f.length);

function f(this: any, a: number, b: number) {
  t("01 length", () => arguments.length);
  t("02 index", () => arguments[0] + ":" + arguments[1]);
  t("03 isArray", () => Array.isArray(arguments));
  t("04 has map", () => typeof (arguments as any).map);
  t("05 has forEach", () => typeof (arguments as any).forEach);
  t("06 has length prop", () => Object.prototype.hasOwnProperty.call(arguments, "length"));
  t("07 own keys", () => Object.getOwnPropertyNames(arguments).join(","));
  t("08 callee absent", () => typeof (arguments as any).callee);
  t("09 typeof", () => typeof arguments);
  t("10 tag", () => Object.prototype.toString.call(arguments));
  t("11 proto is Object.prototype", () => Object.getPrototypeOf(arguments) === Object.prototype);
  t("12 spread works", () => [...(arguments as any)].join(","));
  t("13 slice call", () => Array.prototype.slice.call(arguments).join(","));
  t("14 write index", () => { (arguments as any)[0] = 9; return a; });
  return 0;
}
t("20 call", () => f(1, 2));
