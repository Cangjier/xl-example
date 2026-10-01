// xl:note 值位的动态 import() 仍是调用，不许被收成 ImportType（第 66 轮的对照组）
// xl:expect Method
// xl:absent ImportType
const mod = await import("./m");
