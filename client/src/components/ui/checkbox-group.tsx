import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CheckboxGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }
);
CheckboxGroup.displayName = "CheckboxGroup";

interface CheckboxItemProps {
  id: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label: React.ReactNode;
}

const CheckboxItem = ({
  id,
  checked,
  onCheckedChange,
  disabled,
  label,
}: CheckboxItemProps) => {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
      <Label
        htmlFor={id}
        className={`font-normal ${disabled ? "opacity-50" : ""}`}
      >
        {label}
      </Label>
    </div>
  );
};

export { CheckboxGroup, CheckboxItem };