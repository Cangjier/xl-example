# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状判定的三个结果。

# enum ShapeStates

`ShapeRule.Compute` 与 `ShapeRule.ComputeByIndex` 的返回值。

- case Reject
拒绝：已经攒下的单元不可能构成这个形状，本候选出局。
- case Accept
接受：已经攒下的单元就是这个形状。
- case Uncertain
不确定：还可能是这个形状，继续等后面的单元。
