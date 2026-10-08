// xl:note 复合赋值展开要克隆左侧表达式：克隆体里的二元运算必须带着操作数
// xl:expect BinaryOperator:3,Identifier:7
a[b + c] += 1
