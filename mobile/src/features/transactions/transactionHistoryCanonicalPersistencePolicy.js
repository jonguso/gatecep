/*
 * R7O-R4E7R18
 *
 * Pure Transaction History canonical persistence policy.
 *
 * No network.
 * No auth.
 * No storage.
 * No React Native dependencies.
 *
 * This policy decides what the upload flow MAY do after reading
 * authenticated canonical Transaction History.
 */

function clean(value) {
  return String(
    value ?? ""
  ).trim();
}

function positiveInteger(value) {
  const number =
    Number(value);

  return Number.isInteger(number) &&
    number > 0
    ? number
    : null;
}

export function classifyCanonicalHistoryAuthority(
  canonical = {}
) {
  const authorityEstablished =
    canonical?.authorityEstablished ===
    true;

  const count =
    Number(
      canonical?.count
    );

  const history =
    Array.isArray(
      canonical?.history
    )
      ? canonical.history
      : [];

  if (
    !Number.isInteger(count) ||
    count < 0 ||
    count !== history.length
  ) {
    throw new Error(
      "Canonical Transaction History count is invalid."
    );
  }

  const currentGeneration =
    canonical?.currentGeneration ??
    null;

  /*
   * No server authority exists yet.
   *
   * This is NOT proof of an Admin clear.
   * Legacy/local evidence must not be erased from this state.
   */
  if (!authorityEstablished) {
    if (
      currentGeneration !== null ||
      count !== 0
    ) {
      throw new Error(
        "Unestablished canonical authority must not contain generation or history."
      );
    }

    return {
      state:
        "AUTHORITY_NOT_ESTABLISHED",

      authorityEstablished:
        false,

      currentGeneration:
        null,

      canonicalCount:
        0,

      mayInvalidateLocalEvidence:
        false,

      mayAppendWithObservedGeneration:
        false
    };
  }

  const generation =
    positiveInteger(
      currentGeneration
    );

  if (!generation) {
    throw new Error(
      "Established canonical authority requires a valid currentGeneration."
    );
  }

  /*
   * Established + empty is the state produced when canonical
   * history authority remains but its physical execution rows
   * have been deleted.
   *
   * IMPORTANT:
   * R18 only classifies this state.
   * It does NOT perform a local reset.
   */
  if (count === 0) {
    return {
      state:
        "AUTHORITY_ESTABLISHED_EMPTY",

      authorityEstablished:
        true,

      currentGeneration:
        generation,

      canonicalCount:
        0,

      mayInvalidateLocalEvidence:
        true,

      mayAppendWithObservedGeneration:
        true
    };
  }

  return {
    state:
      "AUTHORITY_ESTABLISHED_WITH_HISTORY",

    authorityEstablished:
      true,

    currentGeneration:
      generation,

    canonicalCount:
      count,

    mayInvalidateLocalEvidence:
      false,

    mayAppendWithObservedGeneration:
      true
  };
}

export function requireCanonicalAppendAuthority(
  canonical = {}
) {
  const classification =
    classifyCanonicalHistoryAuthority(
      canonical
    );

  if (
    classification
      .mayAppendWithObservedGeneration !==
    true
  ) {
    throw new Error(
      "Canonical Transaction History authority is not established for append."
    );
  }

  return {
    observedGeneration:
      classification.currentGeneration,

    authorityState:
      classification.state,

    canonicalCount:
      classification.canonicalCount
  };
}

export function requireVerifiedAppendBatch(
  executions = []
) {
  if (
    !Array.isArray(executions) ||
    executions.length === 0
  ) {
    throw new Error(
      "At least one verified canonical execution is required."
    );
  }

  executions.forEach(
    (execution, index) => {
      if (
        clean(
          execution?.historicalExecutionState
        ).toUpperCase() !==
        "READY"
      ) {
        throw new Error(
          `Execution ${index + 1} is not READY for canonical append.`
        );
      }

      if (
        execution?.executionConfirmed !==
        true
      ) {
        throw new Error(
          `Execution ${index + 1} is not execution-confirmed.`
        );
      }

      if (
        execution?.fifoEligible !==
        true
      ) {
        throw new Error(
          `Execution ${index + 1} is not FIFO-eligible.`
        );
      }

      if (
        execution?.canAffectFifo !==
        true
      ) {
        throw new Error(
          `Execution ${index + 1} cannot affect FIFO.`
        );
      }

      if (
        !clean(
          execution?.executionIdentity
        ) ||
        !clean(
          execution?.exchangeOrderNo
        )
      ) {
        throw new Error(
          `Execution ${index + 1} is missing immutable execution identity.`
        );
      }

      const quantity =
        Number(
          execution?.totalTradedQuantity
        );

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          `Execution ${index + 1} has invalid Total Traded Quantity.`
        );
      }

      const price =
        Number(
          execution?.executionPrice
        );

      if (
        !Number.isFinite(price) ||
        price <= 0
      ) {
        throw new Error(
          `Execution ${index + 1} has invalid execution price.`
        );
      }
    }
  );

  return executions;
}
