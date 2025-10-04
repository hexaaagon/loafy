import * as React from "react";
import { TextInput, View } from "react-native";
import { cn } from "@/lib/utils";
import { useColorScheme } from "@/lib/useColorScheme";

interface InputProps extends React.ComponentProps<typeof TextInput> {
  className?: string;
  containerClassName?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, containerClassName, leftIcon, rightIcon, ...props }, ref) => {
    const { isDarkColorScheme } = useColorScheme();

    return (
      <View className={cn("flex-row items-center", containerClassName)}>
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        <TextInput
          ref={ref}
          className={cn(
            "flex-1 rounded-md bg-secondary p-2 px-4 font-dm-sans text-sm",
            isDarkColorScheme ? "text-white" : "text-black",
            className,
          )}
          placeholderTextColor={isDarkColorScheme ? "#9CA3AF" : "#6B7280"}
          {...props}
        />
        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>
    );
  },
);

Input.displayName = "Input";

export { Input };
