// xl:note 实参表中间的块注释：不得吃掉后面的实参
// xl:expect Function,AreaAnnotation
declare function f(a: number, b: number): void;
f(1, /* mid */ 2);
