// xl:note 行注释贴在方法签名的返回类型后面时，那条注释被收进了返回类型、成员区间也多吃一格
// xl:round 919
// xl:known-gap `interface I { m(): void //c` 换行 `}`：`SignatureTailEnd` 的换行判据只看「换行前那一格是不是符号」，`LineAnnotation` 不是 `LineWrap` 也不是符号之一，于是那条注释被 `tailEnd` 收下、装进返回类型里，`MethodDeclaration`（TS 那边是 `MethodSignature`）的区间从 [27,36) 变成 [27,40)。块注释那份（`/*c*/` 后面直接跟 `}`）同根，记在 `tmp/r917/cm-sweep.mjs` 的 cm070
// xl:expect MethodDeclaration:1,ReturnType:1,TypeDefine:1,LineAnnotation:1
// xl:end
interface I { m(): void //c
}
