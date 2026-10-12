// xl:expect Interface,InterfaceBody,Field,GenericType
// xl:note 类型参数表折行、且收尾的 `>` 独占一行（真实声明里几乎总是这么排）：
// `interface A<` 换行 `T extends B,` 换行 `U extends C` 换行 `>` 换行 `extends D` 换行 `{`。
// 泛型扫描的换行判定必须允许「下一个非空字符是收尾的 >」，否则整条接口连成员一起消失
interface Folded<
  T extends B,
  U extends C
>
  extends D
{
  a: T
  b: U
}
