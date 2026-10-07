// xl:note `else if` 之间夹一条注释——`if` 的位置由段的 `IfWordAt` 字段给出（投影不回原文找）
// xl:expect IfSet,IfSegment,IfCondition,Statement
declare const a: number;
declare const b: number;
if (a) { console.log(1); } else /* if */ if (b) { console.log(2); } else { console.log(3); }
