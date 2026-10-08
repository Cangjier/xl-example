// xl:note 接口 extends 带类型实参的接口（extends A<T>），实参里的逗号不能切断 extends 列表
// xl:expect Interface,InterfaceBody,GenericType
interface I<T> extends A<string>, B<number, string> {}
