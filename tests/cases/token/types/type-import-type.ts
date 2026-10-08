// xl:note 导入类型：类型位的 `import("./m")` / 限定名尾巴 / `typeof` 都在一个 ImportType 里（第 66 轮）
// xl:expect ImportType:2,Method
type A = typeof import("./m").WebSocket;
type B = import("./m").A.B;
