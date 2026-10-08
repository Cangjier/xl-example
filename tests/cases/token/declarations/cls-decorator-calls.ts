// xl:note 装饰器里的调用：`@Component({…})` 是 Decorator > Method（TS 的 Decorator > CallExpression；第 66 轮）
// xl:expect Decorator:3,Method:3
@Component({ selector: "app" })
@Input()
export class Widget {
  @Output() changed = 1;
}
