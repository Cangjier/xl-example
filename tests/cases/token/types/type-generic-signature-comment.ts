// xl:note 接口里的泛型签名：类型参数表与形参表之间夹注释（第 900 轮片段普查量出并收掉）：`<T>` 与 `(` 之间那条注释原来让判据让路，整个签名降级成方法
// xl:round 900
// xl:expect Signature:1,GenericType:1,TypeParameter:1,Parameter:1,ReturnType:1,TypeDefine:2
// xl:end
interface I { <T>/*c*/(a: T): T }
