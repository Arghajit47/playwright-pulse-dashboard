import * as React from "react";
import { VariantProps } from "class-variance-authority";
import { TooltipContent } from "@/components/ui/tooltip";
type SidebarContext = {
    state: "expanded" | "collapsed";
    open: boolean;
    setOpen: (open: boolean) => void;
    openMobile: boolean;
    setOpenMobile: (open: boolean) => void;
    isMobile: boolean;
    toggleSidebar: () => void;
};
declare const SidebarContext: React.Context<SidebarContext | null>;
declare function useSidebar(): SidebarContext;
declare const SidebarProvider: React.ForwardRefExoticComponent<Omit<React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const Sidebar: React.ForwardRefExoticComponent<Omit<React.ClassAttributes<HTMLElement> & React.HTMLAttributes<HTMLElement> & {
    side?: "left" | "right";
    collapsible?: "icon" | "none";
}, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SidebarTrigger: React.ForwardRefExoticComponent<Omit<import("@/components/ui/button").ButtonProps & React.RefAttributes<HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
declare const SidebarInset: React.ForwardRefExoticComponent<Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SidebarHeader: React.ForwardRefExoticComponent<Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SidebarContent: React.ForwardRefExoticComponent<Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SidebarMenu: React.ForwardRefExoticComponent<Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLUListElement>, HTMLUListElement>, "ref"> & React.RefAttributes<HTMLUListElement>>;
declare const SidebarMenuItem: React.ForwardRefExoticComponent<Omit<React.DetailedHTMLProps<React.LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>, "ref"> & React.RefAttributes<HTMLLIElement>>;
declare const SidebarMenuButton: React.ForwardRefExoticComponent<Omit<React.ClassAttributes<HTMLButtonElement> & React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<(props?: ({
    variant?: "default" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
declare const SidebarFooter: React.ForwardRefExoticComponent<Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SidebarSeparator: React.ForwardRefExoticComponent<Omit<Omit<import("@radix-ui/react-separator").SeparatorProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SidebarGroup: React.ForwardRefExoticComponent<Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SidebarInput: React.ForwardRefExoticComponent<Omit<Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "ref"> & React.RefAttributes<HTMLInputElement>, "ref"> & React.RefAttributes<HTMLInputElement>>;
export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarSeparator, SidebarTrigger, useSidebar, };
//# sourceMappingURL=sidebar.d.ts.map