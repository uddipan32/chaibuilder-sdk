export const DEFAULT_APP_THEME = {
  fontFamily: { heading: "Arial", body: "Arial" },
  borderRadius: "6px",
  colors: {
    background: ["#FFFFFF", "#09090B"],
    foreground: ["#09090B", "#FFFFFF"],
    primary: ["#2563EB", "#3B82F6"],
    "primary-foreground": ["#FFFFFF", "#FFFFFF"],
    secondary: ["#F4F4F5", "#27272A"],
    "secondary-foreground": ["#09090B", "#FFFFFF"],
    muted: ["#F4F4F5", "#27272A"],
    "muted-foreground": ["#71717A", "#A1A1AA"],
    accent: ["#F4F4F5", "#27272A"],
    "accent-foreground": ["#09090B", "#FFFFFF"],
    destructive: ["#EF4444", "#7F1D1D"],
    "destructive-foreground": ["#FFFFFF", "#FFFFFF"],
    border: ["#E4E4E7", "#27272A"],
    input: ["#E4E4E7", "#27272A"],
    ring: ["#2563EB", "#3B82F6"],
    card: ["#FFFFFF", "#09090B"],
    "card-foreground": ["#09090B", "#FFFFFF"],
    popover: ["#FFFFFF", "#09090B"],
    "popover-foreground": ["#09090B", "#FFFFFF"],
  },
} as const;

export const DEFAULT_HOME_SEO = {
  title: "Visual Site Builder",
  jsonLD: "",
  noIndex: false,
  ogTitle: "Visual Site Builder",
  noFollow: false,
  metaOther: "",
  description: "",
  canonicalUrl: "",
  ogDescription: "",
} as const;

export function getDefaultHomeSeo(appName: string) {
  return {
    ...DEFAULT_HOME_SEO,
    title: appName,
    ogTitle: appName,
  };
}

export const DEFAULT_HOME_BLOCKS = [
  {
    _id: "Y9xTtS",
    tag: "section",
    _name: "No-Code Hero Section",
    _type: "Box",
    styles: "#styles:,relative overflow-hidden bg-background h-screen flex justify-center items-center",
    backgroundImage: "",
  },
  {
    _id: "U4IbsE",
    tag: "div",
    _name: "Box",
    _type: "Box",
    styles: "#styles:,mx-auto max-w-3xl text-center",
    _parent: "Y9xTtS",
    backgroundImage: "",
  },
  {
    _id: "h_UZdR",
    tag: "div",
    _name: "Box",
    _type: "Box",
    styles: "#styles:,mb-10 flex justify-center animate-in fade-in slide-in-from-top-4 duration-1000",
    _parent: "U4IbsE",
    backgroundImage: "",
  },
  {
    _id: "AV33Pw",
    tag: "span",
    _type: "Span",
    styles:
      "#styles:,inline-flex items-center rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-foreground ring-1 ring-inset ring-border",
    _parent: "h_UZdR",
    content: "ChaiBuilder + NextJS",
  },
  {
    _id: "-UswQS",
    tag: "h1",
    _type: "Heading",
    styles: "#styles:,text-balance font-serif text-5xl font-medium tracking-tight text-foreground sm:text-7xl",
    _parent: "U4IbsE",
    content: "Heading goes here",
  },
  {
    _id: "Mg0GoK",
    _type: "Text",
    styles: "#styles:,text-black",
    _parent: "-UswQS",
    content: "Publish websites with ",
  },
  {
    _id: "da5fie",
    tag: "span",
    _type: "Span",
    styles: "#styles:,italic text-primary",
    _parent: "-UswQS",
    content: "single click.",
  },
  {
    _id: "9plKZu",
    _type: "Paragraph",
    styles: "#styles:,mt-8 text-pretty text-lg font-medium text-muted-foreground sm:text-xl/8",
    _parent: "U4IbsE",
    content:
      "<p> The visual site builder for content-heavy Next.js sites. Drag, drop, and deploy to the edge without touching a line of code. Happy building.</p>",
  },
  {
    _id: "XYQHqQ",
    tag: "div",
    _name: "Box",
    _type: "Box",
    styles: "#styles:,mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row",
    _parent: "U4IbsE",
    backgroundImage: "",
  },
  {
    _id: "JfdeIK",
    link: { href: "/editor" },
    _type: "Link",
    styles:
      "#styles:,group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-xl bg-primary px-10 font-bold text-primary-foreground transition-all hover:scale-105 hover:shadow-[0_0_40px_8px_rgba(var(--primary),0.3)] active:scale-95",
    _parent: "XYQHqQ",
    content: "Link text goes here",
    prefetchLink: false,
  },
  {
    _id: "KJ8m6K",
    tag: "span",
    _type: "Span",
    styles: "#styles:,relative flex items-center gap-2",
    _parent: "JfdeIK",
    content: "Open Editor",
  },
] as const;
