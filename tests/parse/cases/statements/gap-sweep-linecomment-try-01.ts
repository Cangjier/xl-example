// xl:note SWEEP-linecomment/try 落点（657 审计语料）
// xl:expect Statement:5,Bracket:4,Keyword:3,Method:3,Identifier,LineAnnotation,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/try）：MISS TryStatement TS[0,52) «try //c { a(); } catch (e) { b(); } finally { c(); }»
try //c
{ a(); } catch (e) { b(); } finally { c(); }
