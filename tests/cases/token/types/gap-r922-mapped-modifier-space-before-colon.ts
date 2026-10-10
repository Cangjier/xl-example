// xl:note 映射类型的 `-?` 修饰词与冒号之间空一格（或夹一条注释）时，`-` 丢了、`?` 变成平级符号
// xl:round 922
// xl:known-gap `type M<T> = { [K in keyof T]-? : T[K] };`：`-?` 与 `:` **紧挨着写**（`-?:`）
// 是对的，中间隔一个空格就缺 `MinusToken`、多出一个平级的 `QuestionToken`
//（片段普查里同一格由一条块注释触发，`type M<T> = { [K in keyof T]-?/*c*/: T[K] };`）。
// 根因在映射类型修饰词那一段：把「`-` 与 `?` 是一对」挂在了「紧邻」上。
// xl:expect MappedType:1,TypeParameter,Identifier
// xl:end
type M<T> = { [K in keyof T]-? : T[K] };
