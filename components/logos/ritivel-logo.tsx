import Image from 'next/image';

export function RitivelLogo({
  className,
  width = 32,
  height = 32,
  color,
}: {
  className?: string;
  width?: number;
  height?: number;
  color?: string; // Note: color prop is kept for API compatibility but won't affect PNG
}) {
  return (
    <div 
      className={`bg-white rounded-full flex items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <Image
        src="/ritivel.png"
        alt="Ritivel Logo"
        width={width * 0.8}
        height={height * 0.8}
        className="object-contain"
      />
    </div>
  );
}
