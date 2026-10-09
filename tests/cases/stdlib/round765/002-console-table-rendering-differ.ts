// xl:title `console.table` 画的是框线表格——这一格还没做
// xl:round 765
// xl:judge stdout
// xl:want differ
// xl:why **量出来的形状**：Node 的 `console.table` 画的是**框线表格**——
// xl:why `┌─────────┬────────┐` / `│ (index) │ Values │` / `├─────────┼────────┤` 那七八行，
// xl:why 列宽按**内容最宽的那一格**算、每一项的列名取键名、多出来的列叫 `Values`。
// xl:why 而本仓这一族**九支共用一份实现**（第 735 轮），`table` 只是其中的一个名字 ⇒
// xl:why 它印的是 `[ 1, 2, 3 ]`（与 `log` 一字不差）。
// xl:why **为什么这一轮只登记、不收**：它不是「补一格属性」也不是「换一个渲染」——
// xl:why 要写的是**一整份表格渲染器**（列宽测量、键的并集、嵌套值的截断、
// xl:why 以及 `table(obj, keys)` 那第二格），而它与 `dir` 的 options 不是一回事。
// xl:why 排在这一族后面的顺序是：`time` 那一族（墙钟，故意不做）→ `table`（这一份渲染器）
// xl:why → `trace`（要真帧栈，与 `Error.stack` 同一条根）。**先量清再收，不猜**。
// xl:end
console.table([1, 2, 3]);
console.table({ a: 1, b: 2 });
console.table([{ a: 1, b: 2 }, { a: 3, b: 4 }]);
console.log("done");
