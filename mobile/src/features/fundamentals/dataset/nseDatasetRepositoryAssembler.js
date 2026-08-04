import {
  buildNseFundamentalDataset,
  buildNseFundamentalDatasetSummary,
  exportNseFundamentalDataset
} from "./nseFundamentalDatasetGenerator";

import {
  loadFundamentalRecords
} from "../fundamentalRepository";

/*
 * ============================================================
 * PC-025A
 * REPOSITORY DATASET ASSEMBLER
 * ============================================================
 *
 * Builds exportable datasets from the persistent PC-024B
 * repository.
 * ============================================================
 */

export async function buildNseDatasetFromRepository({
  policy = {}
} = {}) {
  const records =
    await loadFundamentalRecords();

  /*
   * Repository records are already research-ready. The generator
   * accepts them again so exports remain consistent and validated.
   */
  return buildNseFundamentalDataset({
    companies:
      records,

    policy
  });
}

export async function exportNseDatasetFromRepository({
  format,
  policy = {}
} = {}) {
  const dataset =
    await buildNseDatasetFromRepository({
      policy
    });

  return {
    dataset,
    summary:
      buildNseFundamentalDatasetSummary(
        dataset
      ),

    export:
      exportNseFundamentalDataset({
        dataset,
        format
      })
  };
}
