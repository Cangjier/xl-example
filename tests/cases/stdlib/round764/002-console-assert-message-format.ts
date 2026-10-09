// xl:title console.assert 的消息那一趟走的是同一份格式串
// xl:round 764
// xl:judge stdout
// xl:note `assert` 的消息那一趟与 `log` 那一族**共用同一个 `FormatConsoleLine`**
// xl:note （第 762 轮抽出来的），所以第 764 轮修的 `%c` / `%j` 两格**在这一条上一起露头**：
// xl:note `console.assert(false, "%c", "css")` 在 Node 里印 `Assertion failed: `（那一格被吃掉、
// xl:note 后面什么都不剩）、`console.assert(false, "%j", { b: 1 })` 印 `Assertion failed: {"b":1}`。
// xl:note **接不住的一份**：`console.assert(false, 1 as any, "x")`——那要拿渲染后的那一行走正则，
// xl:note 这一层没有正则（与 `RegExp` 整族待做同一条根）；踩到的探针把它一起删掉了。
// xl:end
console.assert(false, "%s", "x");
console.assert(false, "%d", 42);
console.assert(false, "%c", "css");
console.assert(false, "%j", { b: 1 });
console.assert(false, "%s");
console.assert(false, "", "y");
console.assert(false, "%o", { b: 1 });
console.log("done");
