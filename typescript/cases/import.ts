// import 声明场景全集：一行一个形态，覆盖 ts 允许的 import 写法。
// 解析器按行验收：能建出 ImportDeclarationShape（含子形状）的记 OK。

// 1. 默认导入
import a from "m";

// 2. 具名导入
import { a } from "m";
import { a, b } from "m";
import { a as b } from "m";
import { a, b as c } from "m";
import {} from "m";

// 3. 命名空间导入
import * as ns from "m";

// 4. 默认 + 具名
import a, { b } from "m";
import a, { b as c } from "m";

// 5. 默认 + 命名空间
import a, * as ns from "m";

// 6. 副作用导入（只执行模块）
import "m";

// 7. type-only
import type { T } from "m";
import type a from "m";
import type * as ns from "m";
import type { T as U } from "m";

// 8. 属性 / 断言
import a from "m" with { type: "json" };
import a from "m" assert { type: "json" };

// 9. 修饰词
export import a from "m";
declare import a from "m";
export declare import a from "m";

// 10. 三种引号
import a from 'm';
import a from `m`;
