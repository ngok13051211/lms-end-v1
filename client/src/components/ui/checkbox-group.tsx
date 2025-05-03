import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CheckboxGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  value?: string[];
  onValueChange?: (value: string[]) => void;
}

const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
  ({ children, className, value, onValueChange, ...props }, ref) => {
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
  value?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
}

const CheckboxItem = ({
  id,
  value,
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
        value={value}
      />
      {label && (
        <Label
          htmlFor={id}
          className={`font-normal ${disabled ? "opacity-50" : ""}`}
        >
          {label}
        </Label>
      )}
    </div>
  );
};

export { CheckboxGroup, CheckboxItem };