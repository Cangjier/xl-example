// 第 148 轮：**类型位的声明一个运行期指令都不产生**。
//
// 第 147 轮量出来的那一档最大的拦路虎：`type X = …` 报
// `unimplemented: expression TypeAliasDeclaration`、`interface I { … }` 报
// `unimplemented: statement InterfaceDeclaration` —— **不是在运行期失败，
// 而是整份文件根本降级不出来**。而这两样在真实的 `.ts` 里几乎无处不在
//（本仓自己 `dist/ts/**` 的每一份产物都带 `interface`）。
//
// 口径是文末那条「**类型位一律擦除**」：类型别名与接口不产生任何运行期东西
//（JS 里也没有它们），它们只描述形状，而本仓不做类型检查——所以整条跳过。
// 同一条判据顺手关掉了另外两处**同形状**的阻塞：
//   · `declare` 那一族（`declare function` / `const` / `class` / `module` / `global`）；
//   · **没有体的函数声明**：重载签名（`function f(a: string): void;` 后面跟实现）
//     与 `abstract m(): void;` —— 它们在运行期什么也不是，语义在那条带体的声明里。
//
// 这一份量的是端到端：`tsrun` 的 stdout 与 `node` 逐字节相同。

// ① 类型别名与接口的各式类型文本（联合 / 交叉 / 条件 / 映射 / 泛型 / 函数 / 深嵌套）
interface Empty {}
interface Generic<T extends object = {}> extends Empty { value: T; m(x: T): T[] }
type Union = "a" | "b" | 1 | null;
type Conditional<T> = T extends string ? number : boolean;
type Mapped<T> = { [K in keyof T]?: T[K] };
type Deep = { a: { b: Array<Map<string, Set<number>>> } };
type Fn = (a: number, b?: string) => void;
export type Exported = 1;
export interface ExportedInterface { a: number }

// ② `declare` 那一族（环境声明：运行期什么也不是）
declare function ambient(x: number): string;
declare const AMBIENT_VERSION: string;
declare class AmbientClass { m(): void }
declare module "ext" { export function f(): void }
declare global { interface Window { x: number } }
declare namespace AmbientNs { interface I { a: number } }
declare namespace AmbientNs2 { const y: number; function g(): void }

// ③ 重载签名 + 实现（签名没有体）
function pick(a: string): string;
function pick(a: number): number;
function pick(a: any): any { return a; }

// ④ 抽象类与抽象方法（成员签名没有体）
abstract class Base {
  abstract kind(): string;
  describe(): string { return "base:" + this.kind(); }
}
class Impl extends Base implements Empty {
  kind(): string { return "impl"; }
}

// ⑤ 它们与运行期代码混在一起，照常跑
function useShape(s: Generic<{ n: number }>): number { return s.value.n; }
console.log(useShape({ value: { n: 7 }, m: (x: any) => [x] }));
console.log(pick("s"), pick(3), new Impl().describe(), new Impl() instanceof Base);

function nested(): number {
  type Local = number;
  interface LocalI { a: Local }
  const v: Local = 5;
  return v;
}
console.log(nested(), typeof new Impl().kind());
