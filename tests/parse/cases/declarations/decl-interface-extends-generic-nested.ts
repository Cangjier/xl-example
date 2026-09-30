// xl:note 接口 extends 里类型实参本身又是泛型实参（extends A<B<string>, C[]>）
// xl:expect Interface,InterfaceBody,GenericType
interface I extends A<B<string>, C[]> {}
