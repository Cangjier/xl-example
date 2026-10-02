// xl:note 对象字面量**属性值**位置上的带括号箭头函数是箭头函数，不是函数类型（第 77 轮）：属性分隔冒号不是类型标注——原来 `FunctionTypeReorganization`（排在 `Lamda` 之前）会把它收成 `FunctionType`，形参表里的 `,` 还会被折成逗号运算符。同一份文件里的**类型字面量**成员是类型标注，必须仍然是函数类型（守卫）。
// xl:expect Lamda:2,LamdaParameters:2,Parameter:4,FunctionType
// xl:absent BinaryOperator
const o = { a: (x, y) => x, b: z => z };
type T = { c: (a: A) => B };
