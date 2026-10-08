// xl:note 函数声明后面那个 `;`（空语句）
// xl:known-gap 声明收完就断了，尾随的空语句没成壳（缺 1 漂 1 多 1）
// xl:expect Function,Keyword
function* g() { yield* h(); };
