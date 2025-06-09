import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { type ControllerProps, type FieldPath, type FieldValues } from "react-hook-form";
declare const Form: any;
declare const FormField: <TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>({ ...props }: ControllerProps<TFieldValues, TName>) => React.JSX.Element;
declare const useFormField: () => any;
declare const FormItem: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
declare const FormLabel: React.ForwardRefExoticComponent<Omit<LabelPrimitive.LabelProps & React.RefAttributes<HTMLLabelElement>, "ref"> & React.RefAttributes<HTMLLabelElement>>;
declare const FormControl: React.ForwardRefExoticComponent<Omit<import("@radix-ui/react-slot", { with: { "resolution-mode": "import" } }).SlotProps & React.RefAttributes<HTMLElement>, "ref"> & React.RefAttributes<HTMLElement>>;
declare const FormDescription: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>>;
declare const FormMessage: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>>;
export { useFormField, Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField, };
//# sourceMappingURL=form.d.ts.map