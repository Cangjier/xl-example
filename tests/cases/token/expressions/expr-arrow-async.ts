// xl:note 异步箭头函数：async (a) => await g(a) 与 async x => x
// xl:expect Lamda
const f = async (a) => await g(a);
const h = async x => x;
