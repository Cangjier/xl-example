// TS 的「静默恢复」形态（parseDiagnostics = 0，但 AST 是恢复产物）：throw 受限产生式换行 + 匿名类声明。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。
// 对照：throw 同一行带表达式 / 有名类声明是正常路径，列在末尾。

// ===== throw 受限产生式：关键字后换行，TS 造 ThrowStatement + 零宽 Identifier =====
throw\na;
throw\na
throw\na;\nb;
throw\na;\na;
throw // c\na;
throw /* c */\na;
throw  \na;
throw\na;\nclass C {}

// ===== 匿名类声明（TS 恢复成无名 ClassDeclaration）=====
class {}
class { a = 1 }
class { m() {} }
class extends B {}
class implements I {}
class<T> {}
class<T> extends B {}

// ===== 对照：throw 同一行 =====
throw a;
throw a;\nb;
throw f();
throw  a;

// ===== 对照：有名类声明 =====
class C {}
class C { a = 1 }
class C<T> extends B {}
