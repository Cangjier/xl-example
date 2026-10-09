// xl:note 接口里的构造签名：`new` 与形参表之间夹注释（第 900 轮片段普查量出并收掉）：`new` 那一支的判据与搬运原来只跳软换行，注释让整个签名降级成方法签名
// xl:round 900
// xl:expect Signature:1,NewType:1,NewArguments:1,Parameter:1,ReturnType:1
// xl:end
interface I { new/*c*/ (a: string): A }
