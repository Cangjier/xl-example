// xl:note new 带类型实参、不带实参表 new A<T>（合法 TS，已知会抛异常）
// xl:expect New,GenericType
const c = new A<T>;
