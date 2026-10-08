// xl:note 换行夹在 `finally` 与它的体之间
// xl:known-gap 产物**直接抛异常**（`cases:tsast` 的抛异常计数盯着它）：`finally` 换行 `{` 认不出那个体
// xl:expect Try
try { a(); } catch (e) { b(); } finally 
{ c(); }
