// xl:note `satisfies` 的类型后面贴一条块注释时，那条注释被算进了 `Satisfies` 的范围
// xl:round 922
// 第 922 轮当轮转绿（765 条变异体片段普查量出的三格之一）：范围终点从「`items` 末项」
// 改成「**最后一个实义单元**」——注释仍然留在节点里（`ReplaceCountAt` 抹掉整段，
// 不搬就整格消失，与第 920 轮 `method-declaration.xl.md` 的收尾同一条理由），只是不算进区间。
// 缺口原来是 `SatisfiesExpression` `[10,56)` vs TS `[10,51)`。
// xl:expect Satisfies:1
// xl:end
const v = { a: 1 } satisfies Record<string, number>/*c*/;
