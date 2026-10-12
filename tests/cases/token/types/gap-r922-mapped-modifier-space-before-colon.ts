// xl:note 映射类型的 `-?` 修饰词与冒号之间空一格（或夹一条注释）时，`-` 丢了、`?` 变成平级符号
// xl:round 922
// 第 923 轮收掉（已知缺口）：缺 `MinusToken[418,419)`、多出平级 `QuestionToken[419,420)`。
// 根因在映射类型修饰词那一段：`-` 已经认领了 `questionToken` 之后，**平级的 `?`**
// （修饰词与冒号不紧邻时它不再被值类型段吞掉）会把它顶掉——现在平级的 `?` 只在
// 这一格还空着时才写。`-?/*c*/: T[K]` 与 `+? :` 两种地形由同一条判据管。
// xl:expect MappedType:1,TypeParameter,Identifier
// xl:end
type M<T> = { [K in keyof T]-? : T[K] };
