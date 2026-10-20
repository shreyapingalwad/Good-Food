import React, { useState } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  aspectRatioClass?: string;
}

// Fallback high-contrast SVG data-URI for resilient offline/firewall rendering
const FALLBACK_FOOD_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="%231C221E"><rect width="600" height="400" fill="%231C221E"/><circle cx="300" cy="200" r="90" fill="%23123B2A" stroke="%23D8F078" stroke-width="2" stroke-dasharray="4 4"/><path d="M300 145 C320 180, 360 200, 300 255 C240 200, 280 180, 300 145 Z" fill="%23D8F078" opacity="0.9"/><text x="300" y="325" fill="%23A9B7A0" font-family="sans-serif" font-size="14" text-anchor="middle" letter-spacing="1">MESSSAVER VERIFIED BATCH</text></svg>`;

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  priority = false,
  aspectRatioClass = '',
  width,
  height,
  ...rest
}) => {
  const [imgSrc, setImgSrc] = useState<string>(() => {
    if (!src) return FALLBACK_FOOD_SVG;
    // Optimize Unsplash images with WebP format and balanced quality
    if (src.includes('images.unsplash.com')) {
      const url = new URL(src);
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('fm', 'webp');
      if (!url.searchParams.has('q')) {
        url.searchParams.set('q', '75');
      }
      return url.toString();
    }
    return src;
  });

  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(FALLBACK_FOOD_SVG);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      onError={handleError}
      width={width}
      height={height}
      className={`${aspectRatioClass} ${className}`}
      {...rest}
    />
  );
};
