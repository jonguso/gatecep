import Constants from "expo-constants";

const PROD_API_URL = "https://gatecep-trader-production.up.railway.app";

function getExpoHostApiUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  const host = String(hostUri || "").split(":")[0];

  const localHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  if (!localHost) return PROD_API_URL;

  return `http://${host}:4000`;
}

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? getExpoHostApiUrl() : PROD_API_URL);
