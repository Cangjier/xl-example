// xl:note 第 869 轮普查量出的缺口（import-typeof-comment-4）：这一条钉的是上面那条根因的一个落点
// xl:known-gap `typeof /*c*/ import("m")`：`typeof` 与 `import(...)` 之间的注释没跨过去 ⇒ `ImportType` 被收成 `TypeQuery`
type T = typeof /*c*/ import("m");
