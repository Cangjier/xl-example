// xl:note 成员位的索引签名（第 79 轮）：接口 / 类型字面量 / 类体三种宿主里它都可能被包在一层 `<Statement>` 里（成员表挂了语句队列之后多出来的那层），而 TS 的成员位放不下语句——投影层要把那一层摊开，并把 `[k: string]` 收成 `parameters`、值类型收成 `type`、`readonly` 收成修饰词。
// xl:expect IndexSignature:3,Parameter:3,TypeDefine:6,Keyword
interface I { [n: number]: T; }
type T2 = { [k: string]: number };
declare class C { readonly [k: symbol]: any; }
