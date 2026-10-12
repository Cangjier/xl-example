// xl:title AST 语料 expressions/expr-meta-property-in-constructor.ts：expr meta property in constructor
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:expect Class,ClassBody,MethodDeclaration,MethodBody
//  xl:note `new.target` 写在类构造器里：那个 `new` 可能还没升成 `Keyword`，
// 投影两种形态都要认（只认 `Keyword` 时它退化成 `new` 上的属性访问，降级层报
// `name is not a local or a capture: new`）
class B {
    constructor() {
        console.log("name", new.target && new.target.name);
    }
}
new B();
