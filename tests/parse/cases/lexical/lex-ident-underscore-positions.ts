// xl:expect Interface,InterfaceBody,MethodDeclaration,Field
// xl:note 下划线出现在名字的各个位置：前缀、后缀、中间（`_init` / `init_` / `in_it` / `IN_IT`）
interface Port_Options {
  _init: number
  init_: string
  in_it: boolean
  IN_IT: number
  _do_it(a_b: number): void
}
