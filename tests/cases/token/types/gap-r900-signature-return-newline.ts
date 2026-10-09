// xl:note 类型字面量里的调用签名：形参表与返回类型标注之间夹**软换行**（第 900 轮片段普查量出、第 901 轮转绿）：原来解析期已经按 ASI 把这一行收成语句，收尾期的判据再跳 trivia 也追不回来
// xl:round 900
// 第 901 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是解析期的续接表
// 不认识「`(… )` 之后换行接 `:`」这一档。现在那一格由
// `Statement.IsPendingSignatureReturnColon` 兜住，而 `SignatureTailEnd` 也跨过那个换行取返回类型。
// xl:expect Bracket:1
// xl:end
type T = { (a: string)
: void };
