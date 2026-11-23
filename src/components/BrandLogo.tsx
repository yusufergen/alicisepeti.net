interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<BrandLogoProps['size']>, { img: string; text: string }> = {
  sm: { img: 'w-6 h-5', text: 'text-base' },
  md: { img: 'w-7 h-6', text: 'text-xl' },
  lg: { img: 'w-9 h-7', text: 'text-2xl' },
};

export function BrandLogo({ size = 'md', showText = true, className = '' }: BrandLogoProps) {
  const styles = SIZE_CLASSES[size];

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/assets/aistudio/alicisepetilogo_5a594064.svg"
        alt={showText ? '' : 'AlıcıSepeti logosu'}
        aria-hidden={showText}
        className={`${styles.img} object-contain shrink-0`}
      />
      {showText && (
        <span className={`font-display ${styles.text} font-bold tracking-tight text-slate-900`}>
          AlıcıSepeti
        </span>
      )}
    </span>
  );
}
