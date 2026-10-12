// xl:note 第 869 轮普查量出的缺口（optional-call-signature-comment-8）：这一条钉的是上面那条根因的一个落点
// 第 873 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `new /*c*/ (a: number): X`：构造签名里 `new` 与形参表之间的注释没跨过去 ⇒ 被收成 `MethodSignature`
type T = { (a: number): void; new /*c*/ (a: number): X };
