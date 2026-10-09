// xl:note 没有表达式的 `throw` 换行、下一行还有一条语句（第 906 轮随那一格一起补的守卫）：零宽 `Identifier` 落在**下一个实义单元**那一格（`x` 的起点），不是行尾——两条语句各自成节点
// xl:round 906
// xl:expect Keyword:1
// xl:end
function f(){ throw
 x; }
