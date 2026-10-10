// token: FinallyBody
// xl:note 换行夹在 `finally` 与它的体之间
// xl:expect Try
try { a(); } catch (e) { b(); } finally 
{ c(); }
