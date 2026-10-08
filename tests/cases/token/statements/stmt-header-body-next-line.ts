// xl:note 循环 / switch 的体写在下一行（中间还可以夹一条注释）：头与体仍是同一条语句
// xl:expect While,WhileBody,For,ForBody,Foreach,ForeachBody,Switch,SwitchSegment
declare const a: number
declare const xs: number[]
while (a)
{ break }
while (a)
/* c */
{ break }
for (;;)
{ break }
for (const x of xs)
/* c */
{ break }
for (const k in {})
{ break }
switch (a)
{ case 1: break }
