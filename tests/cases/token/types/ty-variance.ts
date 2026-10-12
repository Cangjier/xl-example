// xl:note 基线用例（来自缺口审计语料）
// xl:expect FunctionType,TypeParameter,GenericType,Parameter
type A<in T> = (x: T) => void
type B<out T> = () => T
type C<in out T> = T
