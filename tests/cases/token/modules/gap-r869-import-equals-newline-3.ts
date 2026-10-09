// xl:note 第 869 轮普查量出的缺口（import-equals-newline-3）：这一条钉的是上面那条根因的一个落点
// xl:known-gap `import A = require("m")` 里 `=` 与路径之间的换行：`Statement.IsPendingImportHead` 把「已经吃到 `=`」当成写完了（那一档是给 `import A = B.C` 留的），`require(...)` 还没到手
import m = 
 require("m");
