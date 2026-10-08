// xl:note 接口同时 extends 两个泛型接口，且各自带默认/约束形参
// xl:expect Interface,InterfaceBody,GenericType
interface I<T> extends A<T>, B<Array<T>> {
  value: T
}
