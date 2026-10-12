// xl:title `.finally` 的链与另一条链谁先：本仓比 Node 早一跳
// xl:round 766
// xl:judge stdout
// xl:want differ
// xl:why **量出来的形状**：两条互不相干的链——左边四跳之后到 `finally`，右边一跳之后到
// xl:why `finally`。Node 打 `04 fin` 在 `09 keep` **之前**，本仓打 `09 keep` 在 `04 fin` 之前
// xl:why ——本仓的 `.finally` **早一跳**。
// xl:why **根子**：规范里 `p.finally(cb)` 是 `then(v => Promise.resolve(cb()).then(() => v))`
// xl:why 拼出来的，而「用一份承诺去解决另一个承诺」那一步在规范里是**单独一次作业**
// xl:why （`NewPromiseResolveThenableJob`）⇒ 传值那一档要**两跳**；
// xl:why 本仓的引擎在 `RunNativeTask` 的 `passThrough` 那一支只排**一跳**
// xl:why （第 620 轮改的，见 `vm.xl.md` 那一段的账）。
// xl:why **为什么这一轮只登记、不收**：那一跳是**量出来的取舍**——
// xl:why 第 620 轮正是靠「把它从两跳缩到一跳」才对上 `c371-stdlib-promise-finally-passthrough`
// xl:why 那一格的行序（Node 给 `c3 replaced` 在 `v 1` 之前），加回去当场把那一格弄红。
// xl:why 也就是说：**同一个模型在两格上各对一半**，要收得让「传值那一跳」真的走
// xl:why thenable 采纳那条路（引擎里那次作业是另一件事），不是把跳数改成 2。
// xl:why 这条边界本来就写在明处（`promise.xl.md` 的 `PromiseFinally` 那一段与
// xl:why `tests/runtime/check.mjs` 第 8198 行「次序那一格另外说……与本仓**可能不同**」），
// xl:why 这一轮把它**量成一条用例**，好在以后动时序时当场看得见。
// xl:end
Promise.resolve(1).then((v) => { console.log("01", v); return v + 1; }).then((v) => { console.log("02", v); throw new Error("boom"); }).catch((e) => { console.log("03", e.message); return "recovered"; }).finally(() => console.log("04 fin")).then((v) => console.log("05", v));
Promise.resolve("keep").finally(() => "ignored").then((v) => console.log("09", v));
console.log("done");
