// xl:note 第 869 轮普查量出的缺口（import-equals-newline-3）：这一条钉的是上面那条根因的一个落点
// 第 881 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `import A = require("m")` 里 `=` 与路径之间的换行——`ImportCloseRule.Process` 把「已经吃到 `=`」
// 当成这条声明写完了（那一档是给 `import A = B.C` 留的）⇒ 换行处收出一个区间只到 `=` 的 `Import`，
// `require("m");` 另起一条 `ExpressionStatement`（缺 `ExternalModuleReference`、漂 1、多 4）。
// 判据与 `Statement.LineEndsWithEquals`（第 876 轮）对齐成一份：**末了那个实义单元是 `=`** ⇒ 右操作数
// 还没到手 ⇒ 这一段还没写完、换行只是排版。
import m = 
 require("m");
