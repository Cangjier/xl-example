// xl:note 被调用者是括号 / 一次调用时的可选链：整条链逐格成形（第 630 轮）
// xl:expect Method,PropertyAccess,NullConditionalOperator,As,Bracket
declare const x: any;
declare const a: any;
declare const k: any;
declare function f(): any;
(x as T)?.m?.();
(x as T).m?.();
(x)?.m?.();
f()?.m?.();
(a.b)?.c?.();
(a[k])?.c?.();
(x as T)?.m?.(1, 2);
