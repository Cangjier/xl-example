// xl:note 块里的箭头体续上数组字面量、再跟一条复合赋值（三片段组合探针抓到的形状）：
// 复合赋值的展开让列表改短，那个 `[` 成了孤儿，`JsonArrayReorganization.Process` 原来
// 直接 `Replace` 就抛「没有父单元」整份文件解析失败；现在与对象那一支同款早退，
// **先保住内容再让步**（产物里那个 `[1, 2, 3]` 仍是一个 `Bracket`，内容一个不少）。
// xl:expect Bracket:2,ArrayLiteral,Lamda,BinaryOperator
{
x => x
[1, 2, 3]
a += 1
}
