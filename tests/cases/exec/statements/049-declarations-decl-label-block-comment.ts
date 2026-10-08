// xl:title AST 语料 declarations/decl-label-block-comment.ts：decl label block comment
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:expect Label,Bracket,Let,AreaAnnotation
//  xl:note 标签块：名字与冒号之间夹注释，体里仍是语句
block /* c */: { let x = 1; console.log(x); }
