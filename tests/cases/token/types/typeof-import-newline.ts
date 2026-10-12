// xl:note `typeof import` 与它的形参表之间的换行（第 934 轮收掉的
// `gap-r933-typeof-import-newline` 那一族）：**语句位**靠解析期那张「哪些词结束得了一条
// 语句」的表（`import` 是保留字，后面必须跟东西）、**成员位**靠 `SignatureCloseRule` 的
// 一格让路（`IsImportTypeArguments`）——两处都跨过那个换行。
// 守卫四档：类型别名 / 类型字面量成员 / 接口成员 / 同行。
// xl:round 934
// xl:end
type A = typeof import
("m");
type B = { f: typeof import
("m") };
interface I { f: typeof import
("m") }
type C = typeof import("m");
