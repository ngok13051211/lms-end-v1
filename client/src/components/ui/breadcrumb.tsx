import * as React from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  separator?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<"li"> {
  isCurrentPage?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  asChild?: boolean;
  href?: string;
  children?: React.ReactNode;
  className?: string;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ separator = <ChevronRight className="h-4 w-4" />, className, children, ...props }, ref) => {
    const childrenArray = React.Children.toArray(children);
    const childrenWithSeparators = childrenArray.map((child, index) => {
      if (index === 0) {
        return child;
      }
      return (
        <React.Fragment key={index}>
          <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
          {child}
        </React.Fragment>
      );
    });

    return (
      <nav
        ref={ref}
        aria-label="breadcrumb"
        className={cn("flex flex-wrap items-center", className)}
        {...props}
      >
        <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {childrenWithSeparators}
        </ol>
      </nav>
    );
  }
);
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, isCurrentPage, children, ...props }, ref) => {
    return (
      <li
        ref={ref}
        className={cn("inline-flex items-center gap-1.5", className)}
        aria-current={isCurrentPage ? "page" : undefined}
        {...props}
      >
        {children}
      </li>
    );
  }
);
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ className, href, children, ...props }, ref) => {
    if (!href) {
      return (
        <span
          ref={ref}
          className={cn("text-muted-foreground", className)}
          {...props}
        >
          {children}
        </span>
      );
    }
    
    return (
      <Link href={href}>
        <span
          className={cn(
            "transition-colors hover:text-foreground",
            className
          )}
          {...props}
        >
          {children}
        </span>
      </Link>
    );
  }
);
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li"> & {
  children?: React.ReactNode;
}) => {
  return (
    <li
      className={cn("text-muted-foreground", className)}
      {...props}
    >
      {children || <ChevronRight className="h-4 w-4" />}
    </li>
  );
};
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => {
  return (
    <span
      className={cn("flex h-4 w-4 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More</span>
    </span>
  );
};
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};