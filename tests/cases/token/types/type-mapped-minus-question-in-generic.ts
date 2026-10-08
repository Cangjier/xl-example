// xl:note 映射类型的 `-?` 修饰符也要能穿过泛型实参扫描
// xl:expect GenericType,MappedType
let value: Promise<{ [P in keyof T]-?: T[P] }>
