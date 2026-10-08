// xl:expect Interface,InterfaceBody,Field
// xl:note 名字里含 `$` 的接口（`interface I$X { a: number }`）应当成形。
// 同 lex-ident-dollar-variable：`$` 目前是符号，名字被拆开，整条接口不成形。
interface I$X {
  a: number
}
