// xl:note SWEEP-newline/async 落点（657 审计语料）
// xl:expect Bracket,Function,FunctionBody,Identifier:2,Keyword,LineAnnotation:3,Method,Root,Statement:6
// 第 842 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `async` 那一格投成了 `AsyncKeyword`（TS 是 `Identifier`）—— 它是**上下文关键字**，
// 只有紧跟 `function` 时才升级（`keyword.xl.md` 的 `Keyword.IsUpgradable`）。
async 
function f() { await g(); }
