// xl:note for-of / for-in 左值不是声明而是一个表达式时，投射成表达式（不是 VariableDeclarationList）
// xl:expect Foreach,ForeachDefine,ForeachEnumable,ForeachBody,PropertyAccess,NotNull
for (x of xs) {}
for (a.b of xs) {}
for (a!.b of xs) {}
for (a.b.c of xs) {}
for (a.b in xs) {}
for (a.b! in xs) {}
for (x of xs) { let y = x; }
for (const v of xs) {}
for (let w of xs) {}
for (var u in xs) {}
