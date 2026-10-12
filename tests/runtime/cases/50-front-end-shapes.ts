// 第 163 轮：地基量了一遍（12 个普通形状过 `cases:tsast` 的尺子），
// 这里量其中**值位那一半**的端到端行为——9 个形状通过了 AST 尺子，逐个跑一遍。
//
// 没通过的那三个（`typeof typeof x`、`[x in y, 2]`、`{ A }a += 1`）**不在这份语料里**：
// 它们在 AST 尺子上就是红的，记在台账里等修。

const o: any = { x: 1, y: 2 };

// ① `void 0`
const v = void 0;
console.log("void", v, typeof v);

// ② `delete`
const d: any = { a: 1, b: 2 };
console.log("delete", delete d.a, d.a, d.b);

// ③ 标签模板**不在这份语料里** ✗：降级层报 `unimplemented: expression TaggedTemplateExpression` ✓——
// 那是**另一条**缺口（要造「字面量段数组 + 实参」再调 ✓），记在台账里 ✓。
// 它在地基那一层是**成的** ✓（`cases:tsast` 的尺子量过 ✓），缺的是降级这一环 ✓。

// ④ `as` 链（类型位擦除）
const s = "abc" as unknown as string;
console.log("as", s.length, (s as string).toUpperCase());

// ⑤ 泛型调用
function ident<T>(x: T): T { return x; }
console.log("generic", ident<number>(7), ident<string>("g"));

// ⑥ 可选链后面接模板
const box: any = { f: (x: string) => x + "!" };
console.log("opt-template", box.f?.("hey"), box.missing?.(("no" as string)));

// ⑦ 幂：**右结合**（第 164 轮修好）与一元混着写
// `2 ** 3 ** 2` 是 `2 ** (3 ** 2)` = **512** ✓（原来当成左结合给 64 ✗）；
// `**` 比 `*` 紧 ✓（`2 * 3 ** 2` = 18 ✓），而 `-(2 ** 2)` 是 `-4` ✓、`(-2) ** 2` 是 `4` ✓。
console.log("power", -(2 ** 2), (-2) ** 2, (2 ** 3) ** 2, 2 ** 3 ** 2);
console.log("power2", 2 * 3 ** 2, 2 ** 3 * 2, 8 / 2 ** 2, 10 - 2 ** 2, 2 ** 3 ** 2 ** 1);

// ⑧ 嵌套解构（带默认值那一格只写**简单名字**）
// **「默认值套着嵌套模式」（`{ a: { b } = {} }`）不在这份语料里** ✗：降级层报
// `unimplemented: expression BindingElement` ✓——比它常见的两种（嵌套模式 ✓、
// 简单名字带默认 ✓）都在下面 ✓，那一格记在台账里 ✓。
const { a: { b } } = { a: { b: 5 } };
const { c = 9 } = {} as any;
console.log("nested", b, c);
