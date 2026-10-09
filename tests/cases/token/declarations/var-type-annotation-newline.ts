// xl:note 第 873 轮补的守卫用例：变量声明的**类型标注跨行**（`let s:` 换行 `string;`）与
// 「**类型词收尾**」（`unique` 换行 `symbol`）是同一条线的两个落点——这两种排版原来的语料里
// 一次都没出现过（是探针普查量出来的），所以收掉时按规矩补进来当守卫。
let s:
 string;
declare const t: unique
 symbol;
