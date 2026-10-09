// xl:title `slice` / `splice` / `concat` / `reverse` / 栈队列那一族：返回值与实参个数
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的三十余条**：
//   probe-a03 · probe-a10 · probe-a11 · probe-a12 · probe-a13 · probe-a20 · probe-a30 ·
//   probe-a31 · probe-a38 · probe693-a22 · probe693-a41 · probe693-a42 · probe693-a43 ·
//   probe693-a50 · probe693-a52 · probe693-a53 · probe693-a59 · probe693-a60 ·
//   probe694-a28 · probe694-a29 · probe694-a30 · probe696-h21 · probe696-h24 ·
//   probe696-r07（无关那一半）· probe703-a-b12 · probe703-a-b14 · probe703-a-b21 ·
//   probe703-a-b41 · probe703-a-b42 · probe703-a-b43 · probe703-a-b44 · probe703-a-b46 ·
//   probe704-a-f01 · probe704-a-f02 · probe704-a-f03 · p-arr-splice-return · p-arr-tosorted（无关那一半）
//   ＋ `002-array-slice-splice` / `003-array-reverse-concat` / `028-array-splice-forms`
//     / `044-array-splice-return-and-negative` / `070-array-splice-return-and-argc`
//     / `083-splice-argument-forms` / `132-splice-negative`
//
// 判定点只有一个：**这几支的返回什么、实参怎么数**——
//  ① `slice` 负下标从尾数、越界夹住（不改原数组）；
//  ② `splice` 返回**被删的那一段**（原数组被改）；不给第二个实参 = 删到尾巴；
//     `undefined` 当 0；
//  ③ `concat` 摊平**一层**、非数组实参原样接上；
//  ④ `reverse` / `push` / `pop` / `shift` / `unshift` 各自的返回值（`push` 给新长度、
//     `pop` 给弹出的值、`shift` 给被移走的那一个、`unshift` 给新长度）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show([1, 2, 3].slice(-2).join(",")));
  console.log(show([1, 2, 3].slice(1, -1).join(",")));
  console.log(show([1, 2].slice().length));
  console.log(show([1, 2, 3].splice(1, 1).join(",") + "|" + [1, 2, 3].splice(1, 1).length.toString()));
  const sp: any = [1, 2, 3];
  console.log(show(sp.splice(1, 1).join(",") + "|" + sp.join(",")));
  console.log(show(sp.splice(0).length));
  console.log(show(sp.length));
  console.log(show([1, 2, 3].splice(-1).length));
  console.log(show([1, 2].concat([3], 4).length));
  console.log(show([].concat(1, [2, [3]]).length));
  console.log(show([1, 2, 3].concat().length));
  console.log(show([0].concat([]).length + "," + [].concat([1]).length));
  console.log(show([1, 2, 3].reverse().join(",")));
  console.log(show([1, 2, 3].reverse().length));
  console.log(show([1, 2, 3].push(4)));
  console.log(show([1, 2, 3].pop()));
  console.log(show([1, 2, 3].shift() + "|" + [1, 2, 3].shift().toString()));
  console.log(show([2, 3].unshift(1)));
  const st: any = [1, 2];
  st.unshift(0);
  console.log(show(st.join(",")));
  const pop: any = [1, 2, 3];
  console.log(show(pop.pop() + "|" + pop.length));
  const sh: any = [1, 2, 3];
  console.log(show(sh.shift() + "|" + sh.join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
