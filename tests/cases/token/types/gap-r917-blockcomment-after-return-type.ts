// xl:note 块注释（`/*c*/`）贴在方法签名的返回类型后面、后面直接跟着成员体那个 `}`
// xl:round 920
// 与行注释那一档同根（第 917 轮片段普查的 cm070，当时只登记了行注释那两条）：
// 注释在 `tailEnd` 那一趟被收进 `ReturnType`，`MethodDeclaration` 的区间于是从 [27,36)
// 变成 [27,40)。第 920 轮与行注释一起收掉——`SkipPreviousTrivia` 对两种注释一视同仁。
// xl:expect MethodDeclaration:1,ReturnType:1,TypeDefine:1,AreaAnnotation:1
// xl:end
interface I { m(): void /*c*/ }
