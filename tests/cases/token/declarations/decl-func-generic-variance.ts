// xl:note 泛型类型参数带协变修饰符 <out T>
// xl:expect Class,ClassBody,Field,GenericType
class Producer<out T> {
  value: T
}
