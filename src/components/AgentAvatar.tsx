import { useEffect, useState } from 'react';

interface AgentAvatarProps {
  name: string;
  avatarPath?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AgentAvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
};

const BG_PALETTE = [
  'bg-blue-700 text-white',
  'bg-teal-700 text-white',
  'bg-indigo-700 text-white',
  'bg-slate-800 text-white',
  'bg-emerald-700 text-white',
  'bg-cyan-700 text-white',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ED';
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase('tr-TR');
}

function getColorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return BG_PALETTE[Math.abs(hash) % BG_PALETTE.length];
}

export function AgentAvatar({
  name,
  avatarPath,
  size = 'sm',
  className = '',
}: AgentAvatarProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarPath]);

  const sizeClass = SIZE_CLASSES[size];
  const cleanPath = (avatarPath || '').trim();

  if (cleanPath && !imgError) {
    return (
      <img
        src={cleanPath}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${sizeClass} ${getColorClass(name)} rounded-full font-display font-semibold flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
