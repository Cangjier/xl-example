// xl:note 行注释夹在 `catch (e)` 与它的体之间
// xl:expect Try
try { a(); } catch (e) //c
{ b(); } finally { c(); }
