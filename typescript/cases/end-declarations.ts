// end / possible 第 2 块：声明条目的「体前换行」不是 ASI 边界。
// `class C\n{}` 里换行后的 `{` 是类体，`C` 只是声明头的一部分——那里不存在「上一条表达式」，
// 根终结候选不许把它当成 ASI 边界（否则普通声明候选还活着时会抛「终结候选与其它候选同时成立」）。
// 一行一个用例；行内的 \n 由 ast-json.mjs 还原成真实换行。

// ── base：声明头与 `{` 在同一行（对照组） ──
class C {}
interface I {}
enum E {}
declare class C {}

// ── 体前换行：class ──
class C\n{}
class C\n{ }
class C\n{\n}

// ── 体前换行：interface ──
interface I\n{}
interface I\n{ }

// ── 体前换行：enum ──
enum E\n{}
enum E\n{ A }
enum E\n{\nA\n}
enum E\n{\nA,\nB\n}

// ── 体前换行：declare ──
declare class C\n{}
declare class C\n{ }
declare interface I\n{}
declare interface I\n{ }

// ── 暂缓：带成员的体前换行（本块不收；原因不是「体前换行」） ──
// `// ` class C\n{\nx: number;\n}       ← 类成员需要 types 家族的 class element shapes（types-2），declarations chunk 1 明确暂缓
// `// ` interface I\n{\na: number;\n}   ← 接口成员同上
// `// ` declare class C\n{\nx: number;\n}
// `// ` declare interface I\n{\na: number;\n}
// `// ` 证据：同行写法 class C { x: number; } / interface I { a: number; } 同样红，说明红点与「体前换行」无关。

// ── 声明头与 `{` 之间的 trivia：注释 / 空行 / 行尾注释 ──
class C /* c */\n{}
class C\n/* c */{}
class C\n\n{}
class C // c\n{}
interface I /* c */\n{}
interface I\n// c\n{}
enum E /* c */\n{\nA\n}
enum E\n\n{\nA\n}
declare class C /* c */\n{}
declare class C\n// c\n{}
declare interface I\n\n{}

// ── 声明条目之间的换行（前一条声明结束后再来一条，不是 ASI 断句） ──
class C {}\nclass D {}
class C\n{}\nclass D\n{}
interface I {}\ninterface J\n{}

// ── 回归：表达式语句的 ASI 仍然正确 ──
a\n++b;
a\nb;
a\n+b;
a\n(b);
[a, b];
a\nb\nc;

// ── chunk 2：声明条目在 EOF 的收口（每条用例单独 parse，文件就在这里结束） ──
// class / interface / enum / declare class 的单条 EOF 形式已在上面的 base 组（那些行本身就是 EOF 用例），
// 这里补其余种类 + 尾部换行 / 尾部注释变体。
function f() {}
function f(a: A): B { return a; }
enum E { A }
type T = A;
namespace N {}
module N {}
module "m" {}
declare module "m" {}
import x = require("m");
// 尾部换行 / 尾部注释（没有 `;`）
class C {}\n
class C {} // c
class C {}\n// c
interface I {} // c
function f() {} // c
type T = A; // c
// 两条声明背靠背，最后一条在 EOF 收口
class C {} class D {}
class C {} interface I {}
function f() {} class C {}
enum E { A } type T = A;
namespace N {} class C {}
class C {} function f() {}
interface I {} enum E { A }

// ── chunk 2：声明条目之间的换行边界（不是 ASI 断句） ──
class C {}\ninterface I {}
function f() {}\nclass C {}
class C {}\n\nclass D {}
class C {} // c\nclass D {}
interface I {}\nfunction f() {}
enum E { A }\nclass C {}
namespace N {}\nclass C {}
type T = A;\nclass C {}
import x = require("m");\nclass C {}

// ── chunk 2：体前换行：补齐其余种类（class/interface/enum/declare 已在上面的组） ──
function f()\n{}
function f(a: A): B\n{\nreturn a;\n}
module N\n{}
namespace N\n{}

// ── chunk 2：无分号 vs 必须分号（oracle：TS 两种都合法，看本仓是否都能收） ──
type T = A
import x = require("m")
type T = A;\ninterface I {}
class C {}\ntype T = A;

// ── chunk 2 暂缓（红点，原因见 docs/coverage-end.md） ──
// declare function f(): void;        ← 无体函数声明：需要声明侧 end 候选（declarations 未收）
// declare function f()\n{}           ← 同上
// 带成员的体前换行 class C\n{\nx: number;\n}   ← 类成员归 cover-members-1（与「体前换行」无关）

