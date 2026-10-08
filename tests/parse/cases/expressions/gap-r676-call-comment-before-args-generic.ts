// xl:note 调用泛型实参段之后、实参括号之前夹一条注释
// xl:expect Bracket
// xl:known-gap 注释夹在泛型实参段与实参括号之间：调用整条落成 `BinaryExpression(g < number > (1))`，`CallExpression` 缺（与「被调用者与泛型段之间」那条同族，落点不同，r676 探针 call-comment-before-args-generic）
g<number> /* c */ (1);
