// xl:note 尖括号断言只吃一个一元表达式：后面那次二元运算不折进断言（断言是**前缀**那一档）
// xl:expect GenericType:2
// xl:absent BinaryOperator
<number>a + b;
<T>x > y;
