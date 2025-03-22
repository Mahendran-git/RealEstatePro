import { cn } from "@/lib/utils";

interface AvatarPlaceholderProps {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function AvatarPlaceholder({ 
  initials, 
  size = "md", 
  className 
}: AvatarPlaceholderProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base"
  };
  
  return (
    <div 
      className={cn(
        "rounded-full bg-primary text-white flex items-center justify-center font-medium",
        sizeClasses[size],
        className
      )}
    >
      <span>{initials}</span>
    </div>
  );
}
