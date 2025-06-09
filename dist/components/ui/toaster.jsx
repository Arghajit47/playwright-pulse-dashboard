"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Toaster = Toaster;
const use_toast_1 = require("@/hooks/use-toast");
const toast_1 = require("@/components/ui/toast");
function Toaster() {
    const { toasts } = (0, use_toast_1.useToast)();
    return (<toast_1.ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
            return (<toast_1.Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <toast_1.ToastTitle>{title}</toast_1.ToastTitle>}
              {description && (<toast_1.ToastDescription>{description}</toast_1.ToastDescription>)}
            </div>
            {action}
            <toast_1.ToastClose />
          </toast_1.Toast>);
        })}
      <toast_1.ToastViewport />
    </toast_1.ToastProvider>);
}
//# sourceMappingURL=toaster.jsx.map