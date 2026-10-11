// xl:note 第 1210 轮（口径 1.1）收掉：断言里的核是「下标 + 成员」时，下标那一格原来整格丢——
// assertedMember 里那份成员循环是 chainWithOptional 那条循环的第二次抄写，只认三格
// （里层 NCO / 点号 / 名字），下标括号落进 continue ⇒ ElementAccessExpression 与它里面的
// Identifier 一起丢、?. 还挂到了外面那一层属性访问上。两份合成一格 membersOnto，用例留着当守卫。
// xl:round 1210
// xl:end
a?.[c].b!;
