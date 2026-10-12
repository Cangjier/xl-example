// xl:note SWEEP-newline/try 落点（657 审计语料）
// xl:expect Statement:4,Method:3,Identifier,Root,Try,TryBody,CatchBody,CatchDefine,FinallyBody
try 
{ a(); } catch (e) { b(); } finally { c(); }
