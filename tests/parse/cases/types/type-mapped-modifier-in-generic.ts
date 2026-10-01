// xl:note 映射类型修饰符里的 `-`：`Promise<{ -readonly [P in keyof T]: T[P] }>` 必须认出泛型实参
// xl:expect GenericType,MappedType
// xl:absent ObjectLiteral
declare function f(): Promise<{ -readonly [P in keyof T]: T[P] }>
