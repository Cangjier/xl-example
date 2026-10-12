// xl:title 二叉搜索树：插入、遍历、查找、最小最大
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Node2 {
  left: Node2 | null = null;
  right: Node2 | null = null;
  constructor(public value: number) {}
}
class BST {
  root: Node2 | null = null;
  insert(v: number): void {
    const node = new Node2(v);
    if (this.root === null) { this.root = node; return; }
    let cur = this.root;
    for (;;) {
      if (v < cur.value) {
        if (cur.left === null) { cur.left = node; return; }
        cur = cur.left;
      } else {
        if (cur.right === null) { cur.right = node; return; }
        cur = cur.right;
      }
    }
  }
  has(v: number): boolean {
    let cur = this.root;
    while (cur !== null) {
      if (v === cur.value) return true;
      cur = v < cur.value ? cur.left : cur.right;
    }
    return false;
  }
  inorder(): number[] {
    const out: number[] = [];
    const walk = (n: Node2 | null): void => { if (n === null) return; walk(n.left); out.push(n.value); walk(n.right); };
    walk(this.root);
    return out;
  }
  min(): number | null { let c = this.root; while (c && c.left) c = c.left; return c ? c.value : null; }
  max(): number | null { let c = this.root; while (c && c.right) c = c.right; return c ? c.value : null; }
  height(): number {
    const go = (n: Node2 | null): number => (n === null ? 0 : 1 + Math.max(go(n.left), go(n.right)));
    return go(this.root);
  }
}
const t = new BST();
for (const v of [50, 30, 70, 20, 40, 60, 80, 30]) t.insert(v);
console.log(t.inorder().join(","));
console.log(t.has(40), t.has(45), t.min(), t.max(), t.height());
const empty = new BST();
console.log(empty.inorder().length, empty.min(), empty.height());
