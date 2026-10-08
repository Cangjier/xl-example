// xl:expect Interface,InterfaceBody,Field
// xl:note 字符串字面量成员名（lib.dom.d.ts 的事件表整张都是这种形状）：
// `"a": number` / `"b-c"?: string` 必须收成 Field，成员名就是字面量内容
interface M {
  "a": number
  "b-c"?: string
}
