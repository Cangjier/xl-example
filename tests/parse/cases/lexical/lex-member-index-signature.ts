// xl:expect Interface,InterfaceBody,IndexSignature
// xl:note 索引签名（接口里、类型字面量里、类里）都收成 IndexSignature（第 66 轮第五批由 Field 分流）：
// `[key: string]: T` / `[index: number]: T`。方括号按 `ArrayType` 的先例消费掉，
// 内容是「参数名 + 参数类型 + 值类型」。
interface I {
  [key: string]: number
}
