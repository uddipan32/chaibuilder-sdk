import React from "react";

export const BlockSettingsContext = React.createContext<{
  setDragData: (data: any) => void;
}>({
  setDragData: () => {},
});
