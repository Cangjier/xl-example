// xl:title 声明里引用自己 / 递归类型 / 前后引用
// xl:judge stdout
// xl:end

type Tree = { value: number; kids: Tree[] };
const tree: Tree = { value: 1, kids: [{ value: 2, kids: [] }] };
function total(t: Tree): number { return t.value + t.kids.reduce((a, k) => a + total(k), 0); }
console.log(total(tree));
const later = () => next;
const next = 5;
console.log(later());
