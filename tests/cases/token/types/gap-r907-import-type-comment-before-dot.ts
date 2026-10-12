// xl:note 类型位的 `import("m")` 限定名尾巴：右括号与 `.` 之间夹一条注释（第 907 轮片段普查量出；与 `typeof` 那一档同根，这一份钉的是没有 `typeof` 的来路）
// xl:round 907
// 第 907 轮当轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：与 `typeof` 那一档同一处
// （`SkipNextWrapSymbol` → `SkipNextTrivia`），这一份钉的是**没有 `typeof` 的那条来路**。
// xl:expect ImportType:1,Method:1,Identifier:1,AreaAnnotation:1
// xl:end
type T = import("m")/*c*/.A;
