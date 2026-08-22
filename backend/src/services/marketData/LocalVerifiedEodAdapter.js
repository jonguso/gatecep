import { readLatestVerifiedEodSnapshot } from "../../modules/market-cache/marketEod.repository.js";

const adapter = {
  async getPrices() {
    const snapshot = await readLatestVerifiedEodSnapshot();
    if (!snapshot?.data?.length) {
      throw new Error("No verified local EOD market snapshot is available. Run the EOD collector after market close.");
    }
    return snapshot;
  }
};

export default adapter;
