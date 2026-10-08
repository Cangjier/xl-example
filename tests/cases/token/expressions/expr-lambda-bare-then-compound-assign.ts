// xl:note 裸箭头函数表达式后面换行跟一条复合赋值：两条语句都要成形
// 真缺口（同一处的第二种形态）：`Lamda` 本体没有签出范围时
// `Lamda.Clone` 抛 `SourceException`；这一条走的是裸 `Identifier` 形参那一支。
// xl:expect Lamda,BinaryOperator
// xl:absent Class,Interface,Enum,Function
x => x
a += 1
