// import 声明场景：每条以 base 起，再叠加对抗信息（空白 / 注释 / 换行 / 修饰词 / 重复形）。
// 一行一个用例；行内的 \n 由 ast-json.mjs 还原成真实换行（这样多行语句也能逐行对齐）。

// ===== base 1：默认导入 =====
import a from "m";
// + 前导空格
  import a from "m";
// + 前导块注释
/* c */ import a from "m";
// + 词间块注释
import /* c */ a from "m";
// + 词间多空格
import    a    from    "m";
// + import 与子句之间有换行
import\na from "m";
// + 子句与 from 之间有换行
import a\nfrom "m";
// + 行注释夹在中间
import // c\na from "m";
// + 行尾注释
import a from "m"; // c

// ===== base 2：具名导入 =====
import { a } from "m";
import { a, b } from "m";
import { a as b } from "m";
import { a, b as c } from "m";
import {} from "m";
import { a } from "m";
import /* c */ { a } from "m";
import {\n  a,\n  b,\n} from "m";
// + 重复形：三个元素
import { a, b, c } from "m";
// + 重复形：五个元素
import { a, b, c, d, e } from "m";
// + 重复形：别名混排
import { a as b, c, d as e } from "m";
// + 重复形：尾随逗号
import { a, b, } from "m";
// + 重复形 × 换行
import {\n  a,\n  b,\n  c,\n} from "m";
// + 重复形 × 行注释
import {\n  a, // c\n  b,\n  c,\n} from "m";

// ===== base 3：命名空间导入 =====
import * as ns from "m";
import * as ns from "m";
import  *  as  ns  from  "m";

// ===== base 4：默认 + 具名 / 命名空间 =====
import a, { b } from "m";
import a, * as ns from "m";
// + 重复形：具名多元素
import a, { b, c } from "m";
import a, { b as c, d } from "m";
// + 重复形：空具名
import a, {} from "m";
// + 重复形 × 换行
import a, {\n  b,\n  c,\n} from "m";
// + 重复形 × 词间注释
import a, /* c */ { b, c } from "m";

// ===== base 5：副作用导入 =====
import "m";
import  "m";
import /* c */ "m";

// ===== base 6：type-only =====
import type { T } from "m";
import type a from "m";
import type * as ns from "m";
import  type  a  from  "m";
import type\n{ T } from "m";
// + 重复形：多元素
import type { T, U } from "m";
import type { T, U as V } from "m";
// + 重复形 × 换行
import type {\n  T,\n  U,\n} from "m";

// ===== base 7：属性 / 断言 =====
import a from "m" with { type: "json" };
import a from "m" assert { type: "json" };
// + 重复形：多条属性
import a from "m" with { type: "json", other: "x" };
import a from "m" assert { type: "json", other: "x" };

// ===== base 8：修饰词 =====
export import a from "m";
declare import a from "m";
export declare import a from "m";

// ===== base 9：重复语句（同一文件多条 import） =====
import a from "m"; import b from "n";
import a from "m"; import b from "n"; // c
import a, { b, c } from "m"; import { d } from "n";

// ===== base 12（import-attrs）：import attributes sweep =====
import { a } from "m" with { type: "json" };
import * as ns from "m" with { type: "json" };
import x from "m" with { a: "b", c: "d" };
import type x from "m" with { type: "json" };
import { a } from "m" assert { type: "json" };
// + 前导空格 / 行尾注释 / 词间块注释
  import { a } from "m" with { type: "json" };
import { a } from "m" with { type: "json" }; // c
import { a } /* c */ from "m" with { type: "json" };
// + 换行
import { a } from "m"\nwith { type: "json" };
import { a } from "m" with\n{ type: "json" };
// + dynamic import
// import("m");                          —— dynamic import: 语句层 `import` 起点被 ExpressionStatementPossibleShape.CanStart 拒绝（statements 家族），本 chunk 不改该文件，暂缓
// import("m", { with: { type: "json" } });  —— 同上（dynamic import attributes），暂缓
// import("m", { assert: { type: "json" } }); —— 同上，暂缓
