// xl:note 第 869 轮普查量出的缺口（import-typeof-comment-4）：这一条钉的是上面那条根因的一个落点
// 第 875 轮转绿（用例留着当守卫）：`ImportTypeCloseRule.Process` 往左找 `typeof` 那一格
// 改走 `SkipPreviousTrivia`（判据跨了、搬运也跟着跨），不再被中间那条注释挡住。
type T = typeof /*c*/ import("m");
