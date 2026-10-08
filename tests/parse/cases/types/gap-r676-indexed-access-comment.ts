// xl:note 下标访问类型的被索引者与方括号之间夹一条注释
// xl:expect TypeAssign,IndexedAccessType
// xl:known-gap 注释夹在 `T` 与 `[number]` 之间：`IndexedAccessType` 整条缺、方括号里的类型也缺（r676 探针 indexed-access-comment）
type K = T /* c */ [number];
