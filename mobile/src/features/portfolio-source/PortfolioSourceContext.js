import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  buildCanonicalPortfolioView
} from "./canonicalPortfolioViewService";

/*
 * ============================================================
 * PC-028N
 * LIVE PORTFOLIO SOURCE CONTEXT
 * ============================================================
 *
 * Shared source state for Dashboard + Portfolio Hub.
 *
 * - defaults to ALL when real data exists
 * - defaults to PRACTICE only when no real data exists
 * - selecting PRACTICE changes the visible sandbox view only
 * - Wealth Journey remains real-data-only
 * ============================================================
 */

const PortfolioSourceContext =
  createContext(null);

function buildOption(source = {}) {
  return {
    id:
      source?.id ||
      null,

    label:
      source?.name ||
      "Portfolio",

    type:
      source?.type ||
      null,

    isPractice:
      source?.type ===
      "PRACTICE",

    isReal:
      source?.type !==
      "PRACTICE"
  };
}

export function PortfolioSourceProvider({
  children
}) {
  const [
    selectedSourceId,
    setSelectedSourceId
  ] = useState(null);

  const [
    view,
    setView
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState("");

  const refresh =
    useCallback(
      async (
        nextSourceId =
          selectedSourceId
      ) => {
        try {
          setLoading(true);
          setError("");

          const next =
            await buildCanonicalPortfolioView({
              selectedSourceId:
                nextSourceId
            });

          setView(next);

          setSelectedSourceId(
            next
              ?.selection
              ?.selectedSourceId ||
            null
          );

          return next;
        } catch (
          loadError
        ) {
          setError(
            loadError?.message ||
            "Unable to load portfolio sources."
          );

          throw loadError;
        } finally {
          setLoading(false);
        }
      },
      [
        selectedSourceId
      ]
    );

  useEffect(
    () => {
      refresh(null).catch(
        () => {}
      );
    },
    []
  );

  const selectSource =
    useCallback(
      async (
        sourceId
      ) => {
        setSelectedSourceId(
          sourceId
        );

        return refresh(
          sourceId
        );
      },
      [
        refresh
      ]
    );

  const value =
    useMemo(
      () => ({
        loading,
        error,
        view,

        selectedSourceId,

        selectedPortfolio:
          view
            ?.selectedPortfolio ||
          null,

        sourceOptions:
          (
            view
              ?.sourceOptions ||
            []
          ).map(
            buildOption
          ),

        hasRealSources:
          Boolean(
            view
              ?.canonical
              ?.portfolioSources
              ?.hasRealSources
          ),

        isPracticeSelected:
          view
            ?.selectedPortfolio
            ?.type ===
          "PRACTICE",

        isRealSelected:
          Boolean(
            view
              ?.selectedPortfolio &&
            view
              ?.selectedPortfolio
              ?.type !==
              "PRACTICE"
          ),

        wealthActivation:
          view
            ?.wealthActivation ||
          null,

        selectSource,
        refresh
      }),
      [
        loading,
        error,
        view,
        selectedSourceId,
        selectSource,
        refresh
      ]
    );

  return (
    <PortfolioSourceContext.Provider
      value={
        value
      }
    >
      {children}
    </PortfolioSourceContext.Provider>
  );
}

export function usePortfolioSource() {
  const context =
    useContext(
      PortfolioSourceContext
    );

  if (!context) {
    throw new Error(
      "usePortfolioSource must be used inside PortfolioSourceProvider."
    );
  }

  return context;
}
