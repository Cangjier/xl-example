// import.meta / new.target：两者都是 MetaProperty，children 只有名字 Identifier（import / new 是 token，不投影）。
// `import.meta` 的解析链：import 候选在 `.` 处 Reject（它不接受 `.`）→ 表达式语句候选靠
// 「admit import 后下一格必须是 `.`」的唯一状态继续 → builder 的 ParsePrimary 建 MetaProperty。
// 一行一个用例；行内的 \n 由 ast-json.mjs 还原成真实换行。

// ── base ──
import.meta;
import.meta.x;
import.meta["x"];
new.target;

// ── trivia：点两侧的空白 / 注释 / 换行 ──
import . meta;
import  .  meta ;
new . target;
new  .  target ;
import /* c */ . meta;
import.meta /* c */;
/* c */ import.meta;
import.meta\n;
new.target\n;
new\n.target;
import\n.meta;

// ── 与其它表达式组合 ──
f(import.meta);
f(new.target);
import.meta.x.y;
new.target.x;
import.meta["x"]["y"];
typeof import.meta;

// ── 重复形 ──
import.meta; new.target;
import.meta.x; import.meta["y"];
new.target; import.meta;

// ── 回归：合法 import 声明不被表达式候选抢走 ──
import a from "m";
import "m";
import { a } from "m";
import * as ns from "m";
import type { T } from "m";
import a, { b } from "m";

// ===== dynamic import expressions（chunk dynamic-import） =====
import("m");
import("m").then(f);
const p = import("m");
import("m", { with: { type: "json" } });
import("m", { assert: { type: "json" } });
f(import("m"));
await import("m");
(await import("m")).default;
import("m").T;
// + 前导空格 / 词间块注释
  import("m");
import /* c */ ("m");
// + 行尾注释
import("m"); // c
// + 换行
import(\n"m"\n);