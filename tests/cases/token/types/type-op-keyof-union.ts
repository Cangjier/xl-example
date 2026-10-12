// xl:note keyof 的优先级：keyof A | B 是 (keyof A) | B
// xl:expect TypeAssign,Keyword
type X = keyof A | B
