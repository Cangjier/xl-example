// xl:note 推断类型的**约束段与尾随注释**（第 948 轮片段普查量出）：
// `infer C extends D//c` 换行 ` ? E : F` 里那条行注释原来被当成约束段的一格
// ⇒ `SignOut` 取到注释的末尾 ⇒ `InferType` 的区间跨过注释
//（实测 `TS[19,36) vs 产物[19,39)`：漂 1 + 多 1）。TS 那个 `InferType` 到 `D` 为止，
// 注释是**节点外面**的 trivia。现在 trivia 既不进约束段、也不进区间：
// 夹在实义单元**中间**的 trivia 跟着约束段走（它们在区间里面，不加会被整段替换抹掉），
// **末尾**那一段留在节点外面；「约束段后面是不是 `?`」那一问也改成跨 trivia 的口径。
// 末尾是同一条注释但不换行、以及只换行的两种排版本来就是对的，一起钉这里当守卫。
// xl:expect InferType:3,TypeParameter:6
type T<U> = U extends infer A extends string //c
 ? A : never;
type V<U> = U extends infer B extends string /*c*/ ? B : never;
type W<U> = U extends infer C extends string
 ? C : never;
