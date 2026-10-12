// xl:note `import` 与 `type` 之间换行时那条子句照样要认对：`typeOnly` 判真、`type` 那个词不留在产物里（第 984 轮：收集循环自己塞进 `items` 的 trivia 不许当头部）
// xl:expect Import:2,Method:2,ConstString:2,Identifier:2
import
type A = require("m");
import /*c*/ type B = require("m");
