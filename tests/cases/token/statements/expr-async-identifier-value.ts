// xl:note `async` 当普通标识符用（调用位与引用位）：TS 那边是 `Identifier`，不是 `AsyncKeyword`
// xl:expect Bracket,Identifier:3,Let,Root,Statement:2,SymbolToken
async(1);
const v = async;
