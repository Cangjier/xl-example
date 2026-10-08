// xl:note 被调用者与实参括号之间夹着注释：`(` 的位置由 token 出的 `ParenAt` 定位
// xl:expect FunctionType,ArrayType,Lamda,LamdaBody
declare const o: { m: (...args: any[]) => any }
o.m /* ( */ ()
;(() => 1)()
