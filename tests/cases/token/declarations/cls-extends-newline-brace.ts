// xl:note 类声明的继承子句写完、体在下一行（第 912 轮补的守卫）：`class A extends B` 换行 `{}` 是一条 `ClassDeclaration`（体写在下一行只是排版）
// xl:round 912
// 守卫的是 `ClassBranch.IsPendingHead` 那一格：它要能跨过名字**与**继承子句走到 `class`，
// 少一步壳就会在换行处关掉、`{}` 落成裸块。
// xl:end
class A extends B
{}
