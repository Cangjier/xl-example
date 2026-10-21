// §6「缺少 possible」：整类形态一开始根本没有候选，补候选后 compute/build/close 才能进入。
// 覆盖组：D 泛型箭头 / `async<T>` 箭头、G10 装饰器声明、G11 `using` 声明、G5/G6 类型侧候选。
// 来源：tests/cases/token/** 对应缺口（原 token-repros 已并入本目录）；一行一个用例，
// 行内 `\n` 由 ast-json.mjs 还原成真实换行。§5 口径：base 在前，干扰信息（trivia / 重复形）在后。
// 待用户裁定、本文件不写活跃行的场景见 basic-token.ts。

// ── base：D 泛型箭头（含带返回类型 / 尾逗号 / async 泛型） ──
const f1 = <T>(x: T): T => x;
const f2 = <T,>(x: T) => x;
const f3 = async<T>(x: T) => x;
const f4 = async <T>(x: T) => x;

// ── 装饰器声明（G10）：类声明与类成员 ──
@dec class D {}
class E { @dec m() {} }

// ── using 声明（G11） ──
using x1 = a;

// ── 类型侧候选（G5/G6）：映射类型名重映射、接口索引签名 ──
type M1 = { [K in keyof T as `k${K}`]: T[K] };
interface I1 { [k: string]: number }
