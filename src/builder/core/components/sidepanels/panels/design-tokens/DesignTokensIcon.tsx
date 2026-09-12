import { TokensIcon } from "@radix-ui/react-icons";
import React from "react";
interface DesignTokensIconProps {
  className?: string;
}

export const DesignTokensIcon: React.FC<DesignTokensIconProps> = ({ className = "" }) => {
  return <TokensIcon className={className} />;
};
