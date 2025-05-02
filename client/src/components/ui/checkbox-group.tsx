import React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface CheckboxGroupProps {
  value?: string[];
  onValueChange?: (value: string[]) => void;
  className?: string;
  children: React.ReactNode;
}

export function CheckboxGroup({
  value = [],
  onValueChange,
  className,
  children,
}: CheckboxGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            checked: value.includes(child.props.value),
            onCheckedChange: (checked: boolean) => {
              if (onValueChange) {
                if (checked) {
                  onValueChange([...value, child.props.value]);
                } else {
                  onValueChange(value.filter((v) => v !== child.props.value));
                }
              }
            },
          });
        }
        return child;
      })}
    </div>
  );
}

interface CheckboxItemProps {
  id: string;
  value: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function CheckboxItem({
  id,
  value,
  checked,
  onCheckedChange,
}: CheckboxItemProps) {
  return <Checkbox id={id} value={value} checked={checked} onCheckedChange={onCheckedChange} />;
}
