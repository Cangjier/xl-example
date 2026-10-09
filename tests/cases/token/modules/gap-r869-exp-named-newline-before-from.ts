// xl:note 第 869 轮普查量出的缺口（exp-named-newline-before-from）：这一条钉的是上面那条根因的一个落点
// 第 876 轮转绿（用例留着当守卫）：花括号子句到手时 `IsComplete` 就答「写完了」（`from` 对它是可选的），
// 所以判据要看**右边那一行**——`NextLineStartsWithWord(source, "from")`（本体在 `text-common-util.xl.md`），
// 语句壳那一侧（`Statement.IsPendingExportHead`）与收尾规则那一侧（`ExportCloseRule.Process`）问的是同一句。
export { a }
from "m";
