// import 声明场景：每条以 base 起，再叠加对抗信息（空白 / 注释 / 换行 / 修饰词）。
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

// ===== base 3：命名空间导入 =====
import * as ns from "m";
import * as ns from "m";
import  *  as  ns  from  "m";

// ===== base 4：默认 + 具名 / 命名空间 =====
import a, { b } from "m";
import a, * as ns from "m";

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

// ===== base 7：属性 / 断言 =====
import a from "m" with { type: "json" };
import a from "m" assert { type: "json" };

// ===== base 8：修饰词 =====
export import a from "m";
declare import a from "m";
export declare import a from "m";
