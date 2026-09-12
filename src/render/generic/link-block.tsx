import * as React from "react";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types";

type LinkProps = {
  styles: ChaiStyles;
  content: string;
  link: {
    type: "page" | "pageType" | "url" | "email" | "telephone" | "element";
    target: "_self" | "_blank";
    href: string;
  };
  prefetchLink?: boolean;
};

const formatTelephoneLink = (href: string) => {
  return href.replace(/[^\d]/g, "");
};

export const GenericLinkBlock = (props: ChaiBlockComponentProps<LinkProps>) => {
  const { link, styles, children, content } = props;
  const href = link?.type === "telephone" ? `tel:${formatTelephoneLink(link?.href)}` : link?.href;

  const target = link?.target || "_self";
  const rel = target === "_blank" ? "noopener noreferrer" : undefined;

  if (children) {
    return (
      <a href={href || "#"} target={target} rel={rel} aria-label={content} {...styles}>
        {children}
      </a>
    );
  }

  return React.createElement(
    "a",
    {
      ...styles,
      href: href || "#",
      target,
      rel,
      "aria-label": content,
    },
    content,
  );
};
