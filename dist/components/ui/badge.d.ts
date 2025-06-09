import * as React from "react";
import { type VariantProps } from "class-variance-authority";
declare const badgeVariants: (props?: any) => string;
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
}
declare function Badge({ className, variant, ...props }: BadgeProps): React.JSX.Element;
export { Badge, badgeVariants };
//# sourceMappingURL=badge.d.ts.map