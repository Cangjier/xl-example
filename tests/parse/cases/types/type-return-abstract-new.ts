// xl:note 环境函数的返回类型以 `abstract new` 构造签名类型开头
// xl:expect Function,ReturnType,TypeDefine,Keyword
// `abstract` 同样在声明尾部的终止词表里，可它也能是**构造签名类型**的修饰词。
// 判据是**前一个实义单元**：类型续接符（`:` / `|` / `&` / `(` / `,` / `<` / `=>`）之后
// 它一定在类型里。少了这条，返回类型被截断，`TypeDefine` 抛裸 `TypeError`。
declare function f(): abstract new (a: number) => A;
