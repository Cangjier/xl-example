// xl:note 行注释夹在 `finally` 与它的体之间
// xl:expect Try
try { a(); } catch (e) { b(); } finally //c
{ c(); }
