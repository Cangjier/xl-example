// xl:note 块里的箭头体续上数组字面量、再跟一条复合赋值（三片段组合探针抓到的形状）：
// 复合赋值的展开让列表改短，那个 `[` 成了孤儿，`JsonArrayReorganization.Process` 原来
// 直接 `Replace` 就抛「没有父单元」整份文件解析失败；现在与对象那一支同款早退，
// **先保住内容再让步**（产物里那个 `[1, 2, 3]` 仍是一个 `Bracket`，内容一个不少）。
// xl:note 期望值里原来写着 `ArrayLiteral`——那是第 158 轮**之前**的旧读法
// （换行后的 `[` 起一条新语句）。第 158 轮把「行首 `[` 是续行」判对之后，这里与 TS 一致：
// `x => x[1, 2, 3]` 是一条表达式，TS 的 AST 里也**没有** `ArrayLiteral`
// （`ElementAccessExpression` 的下标是一串平级实参）。所以钉住的是 `PropertyAccess` 那层。
// xl:expect Bracket:2,PropertyAccess,Lamda,BinaryOperator
{
x => x
[1, 2, 3]
a += 1
}
