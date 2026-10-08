// xl:note 调用被调用者与它的泛型实参段之间夹一条注释
// xl:expect Let,Bracket
// xl:known-gap 注释夹在 `f` 与 `<string>` 之间：整条调用落成 `BinaryExpression(f < string > (1))`，`CallExpression` 缺（与 `f<string>(1)` 那条泛型实例化同族，这里是**带注释**的排版，r676 探针 generic-comment-before-args）
const a = f /* c */ <string>(1);
