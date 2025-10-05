import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotificationBadge } from '@/hooks/use-notifications';

interface NotificationBadgeProps {
  type?: 'total' | 'messages' | 'custom';
  count?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
}

export default function NotificationBadge({ 
  type = 'total',
  count: customCount,
  priority = 'medium',
  showIcon = false,
  size = 'sm',
  className = '',
  position = 'top-right'
}: NotificationBadgeProps) {
  const { totalCount, messageCount, getBadgeColor } = useNotificationBadge();

  // Determine the count to display
  let displayCount = 0;
  let badgeColor = '';

  if (type === 'custom' && customCount !== undefined) {
    displayCount = customCount;
    badgeColor = getBadgeColor(customCount, priority === 'urgent');
  } else if (type === 'messages') {
    displayCount = messageCount;
    badgeColor = getBadgeColor(messageCount, false);
  } else {
    displayCount = totalCount;
    badgeColor = getBadgeColor(totalCount, false);
  }

  // Don't render if count is 0
  if (displayCount === 0) return null;

  // Size classes
  const sizeClasses = {
    sm: 'h-4 w-4 text-xs min-w-[16px]',
    md: 'h-5 w-5 text-xs min-w-[20px]',
    lg: 'h-6 w-6 text-sm min-w-[24px]'
  };

  // Position classes for absolute positioning
  const positionClasses = {
    'top-right': 'absolute -top-1 -right-1',
    'top-left': 'absolute -top-1 -left-1',
    'bottom-right': 'absolute -bottom-1 -right-1',
    'bottom-left': 'absolute -bottom-1 -left-1',
    'inline': 'relative'
  };

  // Icon based on type and priority
  const getIcon = () => {
    if (!showIcon) return null;
    
    if (type === 'messages') {
      return <MessageCircle className="w-3 h-3" />;
    }
    
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="w-3 h-3" />;
      case 'high':
        return <Bell className="w-3 h-3" />;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  // Format count display (show 99+ for counts over 99)
  const formatCount = (count: number) => {
    if (count > 99) return '99+';
    return count.toString();
  };

  return (
    <Badge
      className={`
        ${sizeClasses[size]}
        ${positionClasses[position]}
        ${badgeColor}
        rounded-full
        flex items-center justify-center
        font-semibold
        border-2 border-white
        shadow-sm
        animate-pulse
        ${className}
      `}
      style={{
        animation: priority === 'urgent' ? 'pulse 1s infinite' : 'none'
      }}
    >
      {showIcon && position === 'inline' ? (
        <div className="flex items-center gap-1">
          {getIcon()}
          <span>{formatCount(displayCount)}</span>
        </div>
      ) : (
        formatCount(displayCount)
      )}
    </Badge>
  );
}

// Wrapper component for relative positioning
export function NotificationWrapper({ 
  children, 
  badgeProps,
  className = ""
}: { 
  children: React.ReactNode;
  badgeProps?: Omit<NotificationBadgeProps, 'position'>;
  className?: string;
}) {
  return (
    <div className={`relative block ${className}`}>
      {children}
      <NotificationBadge {...badgeProps} position="top-right" />
    </div>
  );
}

// Predefined notification badge variants
export function MessageNotificationBadge(props: Omit<NotificationBadgeProps, 'type'>) {
  return <NotificationBadge {...props} type="messages" />;
}

export function UrgentNotificationBadge(props: Omit<NotificationBadgeProps, 'type' | 'priority'>) {
  return <NotificationBadge {...props} type="total" priority="urgent" />;
}

export function InlineNotificationBadge(props: Omit<NotificationBadgeProps, 'position'>) {
  return <NotificationBadge {...props} position="inline" showIcon={true} />;
}