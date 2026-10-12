// xl:note 类里的静态索引签名：IndexSignature 的 modifiers 要收 `static`
// xl:round 893
// xl:expect IndexSignature
// xl:end
// 第 893 轮片段普查量出来的：`class C { static [k: string]: number; }` 在 TS 那边那个
// `IndexSignature` 的 `modifiers` 是 `[StaticKeyword[10,16)]`，而本仓那一格**只找 `readonly`**
// ⇒ 缺 `StaticKeyword` 一格、字段名少一项。三处一起钉：只 `static`、`static readonly`
//（两个修饰词、按源码次序）、以及只 `readonly`（原来就对的那一半）。
class C { static [k: string]: number; }
class D { static readonly [k: string]: number; }
class E { readonly [k: string]: number; }
