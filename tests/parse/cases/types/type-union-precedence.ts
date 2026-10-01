// xl:note 优先级：`&` 比 `|` 紧，`A | B & C` 是 `A | (B & C)`——内层靠节点自己的那一趟折出来
// xl:expect UnionType,IntersectionType
type X = A | B & C
