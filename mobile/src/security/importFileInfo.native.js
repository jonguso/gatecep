// PC-030M20AV3DL
import * as FileSystem from "expo-file-system/legacy";

export async function getImportFileInfo(file) {
  if (!file?.uri) {
    return { exists: false, size: 0, source: "NATIVE_MISSING_URI" };
  }

  const info = await FileSystem.getInfoAsync(file.uri, { size: true });
  return { ...info, source: "NATIVE_FILE_SYSTEM" };
}
