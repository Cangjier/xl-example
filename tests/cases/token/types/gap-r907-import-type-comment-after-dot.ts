// xl:note 类型位的 `import("m")` 限定名尾巴：点号与名字之间夹一条注释（第 907 轮片段普查量出）：TS 那边 `qualifier` 是一个 `QualifiedName`，产物少一格 `Identifier`
// xl:round 907
// 第 907 轮当轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：`IsNameTailAt` 第二跳
// 改成 `SkipNextTrivia`，注释不再让限定名整段丢失。
// xl:expect ImportType:1,Method:1,Identifier:1,AreaAnnotation:1
// xl:end
type T = import("m")./*c*/A;
