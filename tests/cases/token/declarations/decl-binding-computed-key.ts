// xl:note 解构里的计算属性名 `{[k]: v}`：`[k]` 是 propertyName（TS 的 ComputedPropertyName），
// 里面的 k 是**表达式**、不能收成 BindingElement；嵌套模式仍要收（第 66 轮第十一批）
// xl:expect BindingElement:5,Let:3,ObjectLiteral:3,ArrayLiteral:3
const { [k]: v } = o;
const { [k2]: { a } } = o;
const [x, y] = z;
