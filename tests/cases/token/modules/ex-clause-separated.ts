// xl:note 具名子句前面可以夹注释 / 写下一行：`export` 后面那个 `{` 仍是它的子句
// xl:expect Export
export /* c */ { a as b, c, type D };
export
{ a as b, c };
