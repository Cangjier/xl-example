// xl:note SWEEP-linecomment/switch 落点（657 审计语料）
// xl:expect Identifier:2,Keyword,LineAnnotation,Method:2,Root,Statement:4,Switch,SwitchCase,SwitchCompare,SwitchSegment:2,SwitchStatement:2
switch (a) { case 1: b(); break; default: c//c
(); }
