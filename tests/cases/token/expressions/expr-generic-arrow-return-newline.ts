// xl:note 泛型箭头的**返回类型标注**冒号后面换行（第 947 轮（三）收掉的那一格）：
// `const g = <T,>(x: T):` 换行 `T => x;` 在 TS 那边是**一条**声明。
// 判据 `Statement.IsValueArrowReturnColon` 原来只认「`)` 左边是 `=`（或 `async`）」，
// 而泛型箭头那里 `)` 左边是**类型参数段**、`=` 还在它更左边 ⇒ 判否 ⇒ 换行处收壳
// ⇒ 泛型箭头分家（实测缺 5 漂 3 多 8：第一条壳停在 `:` 上、余下那段被读成一条 `Lamda`）。
// 修法与第 928 轮补 `async` 那一档同源（两问串联：`= async <T,>(x: T): T => x` 两个都在）。
// 非泛型箭头（`(x: T):` 换行）与函数声明（`function h(x: T):` 换行）本来就对。
// xl:expect Lamda,GenericType,TypeDefine
const g = <T,>(x: T):
T => x;
const h = async <U>(y: U):
U => y;
