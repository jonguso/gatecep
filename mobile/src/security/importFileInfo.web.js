// PC-030M20AV3DL
// Browser-safe import-file metadata verification.
export async function getImportFileInfo(file) {
  const directSize = Number(file?.file?.size ?? file?.size);

  if (Number.isFinite(directSize) && directSize >= 0) {
    return { exists: true, size: directSize, source: "WEB_FILE" };
  }

  if (file?.uri) {
    try {
      const response = await fetch(file.uri);
      if (response.ok) {
        const blob = await response.blob();
        const blobSize = Number(blob?.size);
        if (Number.isFinite(blobSize) && blobSize >= 0) {
          return { exists: true, size: blobSize, source: "WEB_BLOB" };
        }
      }
    } catch {
      // Security validation fails closed below.
    }
  }

  return { exists: false, size: 0, source: "WEB_UNVERIFIED" };
}
