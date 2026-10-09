// xl:note 体以 `/` 开头：`//` / `/*` 是 trivia（让路），正则仍是体的第一个单元
// xl:expect IfSet:2,IfSegment:3,IfCondition:2,IfBody,IfStatement:2,RegexToken:2
if (a) /re/.test(x);
if (b) { } else /re2/.test(y);
