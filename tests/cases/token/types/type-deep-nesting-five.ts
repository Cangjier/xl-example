// xl:note 五层嵌套的泛型实参
// xl:expect TypeAssign,GenericType
type X = A<B<C<D<E<string>>>>>
