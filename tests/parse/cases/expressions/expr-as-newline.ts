// xl:note `as` 后面换行再写类型：换行是版面，不是语句边界
// xl:expect Let,As,Common
// 之前这里会抛裸 `TypeError`：换行被 `Statement.IsStatementEnd` 判成语句结尾，
// `As` 收集到空列表，取 `items[items.length - 1].SourceRange` 时炸。
const v = x as
  A;
