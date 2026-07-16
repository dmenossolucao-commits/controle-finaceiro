import React from 'react';
import * as Icons from 'lucide-react';

interface IconProps extends Omit<React.ComponentPropsWithoutRef<'svg'>, 'color'> {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}

export const LucideIcon: React.FC<IconProps> = ({ name, className = '', size = 20, color, ...props }) => {
  // Safe lookup with typing fallback
  const IconComponent = (Icons as any)[name];

  if (!IconComponent) {
    // Fallback icon if not found
    return <Icons.HelpCircle className={className} size={size} color={color} {...props} />;
  }

  return <IconComponent className={className} size={size} color={color} {...props} />;
};

export default LucideIcon;
