// xl:note 第 869 轮普查量出的缺口（exp-named-newline-then-from-like）：这一条钉的是上面那条根因的一个落点
// 第 877 轮转绿（用例留着当守卫）：`from("m")` 里那个字符串装在 `Method(name="from")` 里面，
// 具名导出的 `moduleSpecifier` 于是要在 `Method` 里**也**找一次
// （`print-ast-common.xl.md` 的 `moduleSpecifierIn` / `moduleHolderOf`），
// 而那一格在 TS 那边是 `ParenthesizedExpression`（区间 `[左括号, 字符串末尾)`）。
export { a }
from("m");
