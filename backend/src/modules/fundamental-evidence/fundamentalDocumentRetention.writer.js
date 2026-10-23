import {
  mkdir,
  open,
  readFile,
  rename,
  rm
} from "node:fs/promises";

import path from "node:path";
import crypto from "node:crypto";

function sha256(buffer) {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

function requireBuffer(value) {
  if (
    !Buffer.isBuffer(value) ||
    value.length === 0
  ) {
    throw new Error(
      "A non-empty validated document buffer is required."
    );
  }

  return value;
}

function resolveContainedPath({
  storageRoot,
  relativePath
}) {
  const root =
    path.resolve(storageRoot);

  const target =
    path.resolve(
      root,
      relativePath
    );

  const relative =
    path.relative(
      root,
      target
    );

  if (
    !relative ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error(
      "Document storage path escaped its configured root."
    );
  }

  return {
    root,
    target
  };
}

export async function retainValidatedFundamentalDocument({
  retention,
  documentBuffer,
  storageRoot
} = {}) {
  if (
    retention?.eligible !== true ||
    retention?.reason !==
      "VALIDATED_DOCUMENT_ELIGIBLE" ||
    retention?.persistence !==
      "ELIGIBLE_NOT_WRITTEN"
  ) {
    throw new Error(
      "Document is not eligible for retention."
    );
  }

  const relativePath =
    retention
      ?.storageIdentity
      ?.relativePath;

  if (!relativePath) {
    throw new Error(
      "Retention storage identity is required."
    );
  }

  if (!storageRoot) {
    throw new Error(
      "Document storage root is required."
    );
  }

  const buffer =
    requireBuffer(
      documentBuffer
    );

  const {
    target
  } =
    resolveContainedPath({
      storageRoot,
      relativePath
    });

  const contentHash =
    sha256(buffer);

  await mkdir(
    path.dirname(target),
    {
      recursive: true
    }
  );

  /*
   * Existing canonical path:
   *
   * Same bytes => idempotent success.
   * Different bytes => fail closed.
   *
   * Never silently replace previously retained
   * evidence at the same canonical identity.
   */
  try {
    const existing =
      await readFile(target);

    const existingHash =
      sha256(existing);

    if (
      existingHash === contentHash
    ) {
      return {
        retained: true,
        created: false,
        idempotent: true,
        relativePath,
        contentHash,
        sizeBytes:
          buffer.length
      };
    }

    throw new Error(
      "Canonical document path already contains different content."
    );
  } catch (error) {
    if (
      error?.code !== "ENOENT"
    ) {
      throw error;
    }
  }

  const temporaryPath =
    target +
    ".tmp-" +
    process.pid +
    "-" +
    crypto
      .randomBytes(8)
      .toString("hex");

  let handle = null;

  try {
    /*
     * wx prevents accidental overwrite if a
     * temporary filename somehow collides.
     */
    handle =
      await open(
        temporaryPath,
        "wx"
      );

    await handle.writeFile(
      buffer
    );

    await handle.sync();

    await handle.close();
    handle = null;

    /*
     * Re-check canonical destination immediately
     * before rename. This preserves fail-closed
     * behavior if another writer won the race.
     */
    try {
      const existing =
        await readFile(target);

      const existingHash =
        sha256(existing);

      if (
        existingHash === contentHash
      ) {
        await rm(
          temporaryPath,
          {
            force: true
          }
        );

        return {
          retained: true,
          created: false,
          idempotent: true,
          relativePath,
          contentHash,
          sizeBytes:
            buffer.length
        };
      }

      throw new Error(
        "Canonical document path already contains different content."
      );
    } catch (error) {
      if (
        error?.code !== "ENOENT"
      ) {
        throw error;
      }
    }

    await rename(
      temporaryPath,
      target
    );

    return {
      retained: true,
      created: true,
      idempotent: false,
      relativePath,
      contentHash,
      sizeBytes:
        buffer.length
    };
  } catch (error) {
    if (handle) {
      await handle.close()
        .catch(() => {});
    }

    await rm(
      temporaryPath,
      {
        force: true
      }
    ).catch(() => {});

    throw error;
  }
}

export default {
  retainValidatedFundamentalDocument
};
