// xl:expect Interface,InterfaceBody,Field
// xl:note 下划线是标识符字符：`interface A_b { readonly MIN_EXT: number }` 这条接口必须成形
//（`_` 曾被当成符号，名字被拆成 Identifier/SymbolToken/Identifier 三段，整条接口消失）
interface A_b {
  readonly MIN_EXT: number
}
