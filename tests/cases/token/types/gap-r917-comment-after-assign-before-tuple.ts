// xl:note 注释夹在 `=` 与类型位的 `[` 之间时，同一格也落成值位的下标访问
// xl:round 917
// xl:known-gap 与 `gap-r917-comment-before-type-bracket` 同一格、不同落点：注释贴在 `=` 与 `[` 之间（注释在 `DecideBracketContext` 的回扫里是 trivia，所以外层 `[` 的 `Context` 是对的，可内层 `C[]` 的空方括号仍然比 `TupleType` 早成形一步）
// xl:expect TupleType:1,RestType:1,PropertyAccess
// xl:end
type Z = /*c*/[A, B?, ...C[]];
