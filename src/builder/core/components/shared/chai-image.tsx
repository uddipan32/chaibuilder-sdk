"use client";

import { isEmpty } from "lodash-es";
import React, { ImgHTMLAttributes, useState } from "react";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iI2Q1ZDdkYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIFBsYWNlaG9sZGVyPC90ZXh0Pjwvc3ZnPg==";

export interface ChaiImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  fallbackSrc?: string;
  onError?: (error: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  className?: string;
  loading?: "lazy" | "eager";
}

/**
 * ChaiImage - A custom image component with error handling and fallback support
 *
 * Features:
 * - Automatic fallback to placeholder on error
 * - Custom fallback image support
 * - Lazy loading support
 * - Error and load event handlers
 * - Optimized for performance
 *
 * Note: Uses standard img tag for maximum compatibility with the builder.
 * For production sites, consider using Next.js Image component.
 */
export const ChaiImage: React.FC<ChaiImageProps> = ({
  src,
  alt = "",
  fallbackSrc = PLACEHOLDER_IMAGE,
  onError,
  onLoad,
  loading = "lazy",
  className,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
      onError?.(event);
    }
  };

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(false);
    onLoad?.(event);
  };

  React.useEffect(() => {
    if (src && src !== imgSrc && !hasError) {
      setImgSrc(src);
    }
  }, [src, imgSrc, hasError]);

  if (isEmpty(src) && isEmpty(fallbackSrc)) {
    return null;
  }

  return (
    <img
      {...props}
      src={imgSrc}
      alt={alt}
      loading={loading}
      onError={handleError}
      onLoad={handleLoad}
      className={className}
    />
  );
};

export default ChaiImage;
