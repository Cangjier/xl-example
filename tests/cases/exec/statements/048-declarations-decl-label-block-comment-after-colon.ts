// xl:title AST 语料 declarations/decl-label-block-comment-after-colon.ts：decl label block comment after colon
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:expect Label,Bracket,Let,AreaAnnotation
//  xl:note 标签块：冒号与 `{` 之间夹注释
block2: /* c */ { let x = 2; console.log(x); }
