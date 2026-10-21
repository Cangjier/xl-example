// §6「possible compute 不对」：候选在「这一格该不该认」上判错（成员名 vs 修饰词、跨行边界、
// 类型成员分派、mapped 值换行）。
// 覆盖组：K/G5/G6 类体索引签名与成员名分派、C8 `readonly` 作成员名、D3 修饰词与名字、
// D4 顶层 `abstract`/`declare` 换行、D12 mapped 值换行、G4 `!` 后缀、G6 `a?` 无类型成员、
// G5 无返回类型调用签名、具名可选元组。
// 来源：token-repros/possible-compute-class-members.ts、possible-compute-decl-boundary.ts、
// possible-compute-type-builder.ts（均已并入）；一行一个用例，行内 `\n` 由 ast-json.mjs 还原。
// §5 口径：base 在前，trivia / 重复形变体在后。

// ── K / G5 / G6：类体索引签名（base → static / readonly 修饰 → 修饰词与名字换行） ──
class C1 { [key: string]: number }
class C2 { static [k: string]: number; }
class C3 { readonly [k: symbol]: string }

// ── C8：`readonly` 既可作修饰词也可作成员名（下一格是 `(` 时是名字） ──
class C4 { readonly() {} }
class C5 { static readonly() {} }

// ── D3：修饰词与成员名分派（同一行修饰词 vs 换行后成字段名） ──
class C6 { public static readonly a = 1; private m() { } }

// ── D4：顶层修饰词与关键字之间换行 = 两条语句（换行用行内 \n） ──
abstract\nclass A {}
declare\nmodule "m" {}

// ── G4：JSDocNonNullableType（`!` 后缀）在类型位 / as 位 / 数组位 ──
type T1 = a!;
type T2 = (a!);
type T3 = Box<a!>;
const q1 = f() as T!;
const q2 = f() as T![];

// ── G6：可选无类型成员（`a?`）──
interface I1 { a? }
interface I2 { a?; }

// ── G5：无返回类型调用签名、具名可选元组 ──
type T4 = { (a: string) };
type T5 = [A?, ...B, C, name: D?, ...rest: E[]];

// ── D12：mapped 值后成员 / mapped 值后空方括号（换行用行内 \n） ──
type T6 = { [K in keyof U]:U; [X]: A };
type T7 = { [K in keyof U as `k${K}`]:U\n[K] };
type T8 = { [K in keyof U]:U\n[] };

// ── 条件类型 / infer 约束回退（conditional-infer 尾巴） ──
type N1 = A extends B ? C extends D ? infer E extends F ? G : H : I : J;
type N2 = infer E extends F ? G : H;
type N3 = A extends infer E extends B ? E : never;
type N4 = A extends B ? infer E extends F : G;
type N5 = infer E extends F;
