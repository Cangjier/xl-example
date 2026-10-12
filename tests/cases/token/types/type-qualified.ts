// xl:note 限定名 A.B.C 以及限定名上的泛型实参
// xl:expect TypeAssign,GenericType
type X = A.B.C
type Y = A.B.C<T>
