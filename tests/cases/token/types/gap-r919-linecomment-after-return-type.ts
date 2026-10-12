// xl:note 行注释贴在方法签名的返回类型后面时，那条注释被收进了返回类型、成员区间也多吃一格
// xl:round 919
// 第 920 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `SignatureTailEnd` 的循环走到那条 `LineAnnotation` 时把它记成了 `tailEnd`——注释既不是
// `;` / `,`、也不是软换行，`IsDeclarationTailStop` 更认不出它，于是它被装进 `ReturnType`、
// `MethodDeclaration`（TS 那边是 `MethodSignature`）的区间从 [27,36) 变成 [27,40)。
// 现在收尾一律退回最后一个**实义单元**（`SkipPreviousTrivia`），判据与 `field.xl.md` 的
// `MemberEnd` 同源；同根的三处（类型字面量里的调用签名、块注释、类体里的方法）另有用例守着。
// **不写 `LineAnnotation:1`**：头部这些说明行自己也会被解析成 `<LineAnnotation>`
// （`cases:tags` 第 1017 轮删之前会剥掉 `// xl:` 开头的行），写个数就成了一条假的期望。
// xl:expect MethodDeclaration:1,ReturnType:1,TypeDefine:1
// xl:end
interface I { m(): void //c
}
