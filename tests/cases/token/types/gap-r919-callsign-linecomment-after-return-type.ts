// xl:note 类型字面量里的调用签名：行注释贴在返回类型后面，注释原来是返回类型的一部分
// xl:round 920
// 与 `gap-r919-linecomment-after-return-type` **同根、不同落点**——这一条走的是
// `signature.xl.md` 那一份**独立实现**的 `SignatureTailEnd`（无名签名那条路），
// 它连「换行前那一格」都还没跨 trivia：`Get(units, i - 1)` 拿到的正是那条注释。
// 第 920 轮一并收掉（那一份现在与 `method-declaration.xl.md` 同一句判据）。
// **不写 `LineAnnotation:1`**：头部这些说明行自己也会被解析成 `<LineAnnotation>`，
// 写个数就成了一条假的期望（`cases:tags` 只剥 `// xl:` 开头的行）。
// xl:expect Signature:1,ReturnType:1
// xl:end
type T = { (a: string): void //c
}
