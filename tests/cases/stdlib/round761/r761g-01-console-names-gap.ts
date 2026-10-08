// xl:title `console` 上还缺的名字：`assert` / `trace` / `time` 那一族 / `group` 那一族
// xl:round 761
// xl:judge stdout
// xl:want differ
// xl:why **量出来的形状**（第 761 轮普查当场红的那一行）：`Object.keys(console).length`
// xl:why 在 Node 里是 **25**、本仓这一轮收掉 `count` / `countReset` 之后是 **10**。
// xl:why **还缺的十五个名字分三档**（都不是「忘挂一格」）：
// xl:why ① **`assert`**：它在条件为假时往 **stderr** 印 `Assertion failed: <格式化后的实参>`，
// xl:why    条件为真时**一声不响**——本仓已经有格式串那一套（`util.format` 那一段），
// xl:why    差的只是「读真假 + 挑流 + 固定前缀」那一小段（下一轮可收）。
// xl:why ② **`group` / `groupCollapsed` / `groupEnd`**：它们要**缩进状态**，
// xl:why    而缩进落在**每一行**上（不只 `log`）⇒ 要动那一族共用的渲染口。
// xl:why ③ **`time` / `timeEnd` / `timeLog`**：印的是**墙钟毫秒**（`t: 0.008ms`），
// xl:why    逐字节不可比 ⇒ 判据立不住，本仓**故意不做**（写在 `ConsoleCount` 那一段里）。
// xl:why 其余（`clear` / `trace` / `profile` / `profileEnd` / `timeStamp` / `context` / `createTask`
// xl:why / `Console` / `_stdout` / `_stderr` / `_times` / `_ignoreErrors` / `_stdoutErrorHandler`
// xl:why / `_stderrErrorHandler`）是**宿主接口面**或**调试器接口**：
// xl:why `console.trace` 要真帧栈（那条与 `Error.stack` 同一条根，第 697 / 704 / 708 轮登着），
// xl:why `_stdout` 那一族是 Node 自己的内部件、**不在规范里**。
// xl:why **为什么这一轮只收 `count` / `countReset`**：它们是这一族里唯一**有状态**的一对，
// xl:why 也是唯一「丢掉就报 `cannot call a non-closure value`」的一对——
// xl:why 其余各档的代价写在上面，**先量清再收，不猜**。
// xl:end
console.log("count", typeof console.count, "countReset", typeof console.countReset);
console.log("assert", typeof (console as any).assert, "trace", typeof (console as any).trace);
console.log("time", typeof (console as any).time, "timeEnd", typeof (console as any).timeEnd, "timeLog", typeof (console as any).timeLog);
console.log("group", typeof (console as any).group, "groupEnd", typeof (console as any).groupEnd, "groupCollapsed", typeof (console as any).groupCollapsed);
console.log("clear", typeof (console as any).clear, "Console", typeof (console as any).Console);
console.log("keys", JSON.stringify(Object.keys(console)));
const missing = ["assert", "clear", "context", "createTask", "group", "groupCollapsed", "groupEnd", "profile", "profileEnd", "time", "timeEnd", "timeLog", "timeStamp", "trace", "Console"].filter((k) => typeof (console as any)[k] === "undefined");
console.log("missing", missing.length, missing.join(","));
