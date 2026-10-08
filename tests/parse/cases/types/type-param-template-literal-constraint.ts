// xl:note 泛型约束里是一个模板字面量类型
// xl:known-gap 约束位上的 `` `a${A}b` `` 不成形（缺 15 多 7，还带一处未映射 Bracket）
// xl:expect Keyword,String,InterpolationString
function f14<X extends `a${A}b`>(x: X): X { return x; }
