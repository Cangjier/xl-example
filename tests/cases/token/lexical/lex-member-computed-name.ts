// xl:expect Interface,InterfaceBody,Field
// xl:note 计算成员名 `[Symbol.iterator]: number` 收成 Field，名字由括号里的内容拼出来（`Symbol.iterator`）
interface N {
  [Symbol.iterator]: number
}
