export type ChaiPageMetadata = {
  title?: string;
  description?: string;
  metadataBase?: URL;
  openGraph?: {
    title?: string;
    description?: string;
    images?: string[];
    url?: string;
    locale?: string;
    type?: "website";
  };
  alternates?: {
    canonical?: string;
    languages?: Record<string, string>;
  };
  robots?: {
    index?: boolean;
    follow?: boolean;
    googleBot?: {
      index?: boolean;
      follow?: boolean;
    };
  };
  other?: Record<string, string>;
  icons?: {
    icon?: string;
  };
};
