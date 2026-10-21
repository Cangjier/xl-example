// xl:note 类成员族修复的最小复现（一条一行；本子目录不是 ast-json 的构造枚举，只作人读回归样本）
// 覆盖：类体索引签名（含 static/readonly 修饰）、readonly/static 作成员名、修饰词与成员名分派。
// 换行/块注释换行的修饰词分派由 tests/cases/token/declarations/gap-sweep-*-clsmod-0{1,3,4}.ts 与
// decl-modifier-blockcomment-linebreak.ts 覆盖（它们需要真实多行，不能压成一行）。
class C { [key: string]: number }
class D { static [k: string]: number; }
class E { readonly [k: symbol]: string }
class A { readonly() {} }
class B { static readonly() {} }
class F { public static readonly a = 1; private m() { } }
