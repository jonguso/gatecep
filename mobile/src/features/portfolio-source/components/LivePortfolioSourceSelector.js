import React from "react";

import PortfolioSourceSelector from "./PortfolioSourceSelector";

import {
  usePortfolioSource
} from "../PortfolioSourceContext";

export default function LivePortfolioSourceSelector({
  compact = false
}) {
  const {
    sourceOptions,
    selectedSourceId,
    selectSource
  } =
    usePortfolioSource();

  return (
    <PortfolioSourceSelector
      compact={
        compact
      }
      options={
        sourceOptions
      }
      selectedSourceId={
        selectedSourceId
      }
      onChange={
        selectSource
      }
    />
  );
}
