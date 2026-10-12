// xl:title `console` 上还缺的名字：`trace` / `time` 那一族 / 宿主接口面
// xl:round 761
// xl:judge stdout
// xl:want differ
// xl:why **量出来的形状**（第 761 轮普查当场红的那一行）：`Object.keys(console).length`
// xl:why 在 Node 里是 **25**、本仓这一轮收掉 `count` / `countReset` 之后是 **10**。
// xl:why **第 763 轮更新**：`group` / `groupCollapsed` / `groupEnd` 三格**已收**
// xl:why ⇒ 本仓 **13** 个键、缺的名字 **15 → 11**（那一行读数就是这一条用例的判据）。
// xl:why **还缺的十一个名字分三档**（都不是「忘挂一格」）：
// xl:why ① **`time` / `timeEnd` / `timeLog`**：印的是**墙钟毫秒**（`t: 0.008ms`），
// xl:why    逐字节不可比 ⇒ 判据立不住，本仓**故意不做**（写在 `ConsoleCount` 那一段里）。
// xl:why ② **`trace`**：它要真帧栈——与 `Error.stack` **同一条根**
// xl:why    （第 697 / 704 / 708 轮登着，第 751 轮也登过一次）。
// xl:why ③ 其余（`clear` / `profile` / `profileEnd` / `timeStamp` / `context` / `createTask`
// xl:why    / `Console`）是**宿主接口面**或**调试器接口**——`_stdout` 那一族（`_stdout` /
// xl:why    `_stderr` / `_times` / `_ignoreErrors` / `_stdoutErrorHandler` /
// xl:why    `_stderrErrorHandler`）是 Node 自己的内部件、**不在规范里**，
// xl:why    而它们**不可枚举**，所以 `Object.keys` 那 25 个里本来也没有。
// xl:why **收过的两批**：第 761 轮 `count` / `countReset`、第 762 轮 `assert`、
// xl:why 第 763 轮 `group` 那一族三格——**先量清再收，不猜**。
// xl:end
console.log("count", typeof console.count, "countReset", typeof console.countReset);
console.log("assert", typeof (console as any).assert, "trace", typeof (console as any).trace);
console.log("time", typeof (console as any).time, "timeEnd", typeof (console as any).timeEnd, "timeLog", typeof (console as any).timeLog);
console.log("group", typeof (console as any).group, "groupEnd", typeof (console as any).groupEnd, "groupCollapsed", typeof (console as any).groupCollapsed);
console.log("clear", typeof (console as any).clear, "Console", typeof (console as any).Console);
console.log("keys", JSON.stringify(Object.keys(console)));
const missing = ["assert", "clear", "context", "createTask", "group", "groupCollapsed", "groupEnd", "profile", "profileEnd", "time", "timeEnd", "timeLog", "timeStamp", "trace", "Console"].filter((k) => typeof (console as any)[k] === "undefined");
console.log("missing", missing.length, missing.join(","));
