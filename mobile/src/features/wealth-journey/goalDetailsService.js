import {
  userSetItem
} from "../../auth/userStorage";

import {
  loadInvestorContext
} from "../investor/investorContextStore";

import {
  saveInvestorProfile
} from "../profile/api/investorProfileApi";

function clean(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function goalKey(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function safeGoals(value) {
  return Array.isArray(value) ? value : [];
}

function goalName(value) {
  if (value && typeof value === "object") {
    return clean(value.name ?? value.title ?? value.goal);
  }

  return clean(value);
}

export async function loadCanonicalGoalDetails({ goalId, name } = {}) {
  const context = await loadInvestorContext();
  const profile = context?.storedProfile || {};
  const nested =
    profile?.profile && typeof profile.profile === "object"
      ? profile.profile
      : {};

  const goals = [
    ...safeGoals(profile?.goals),
    ...safeGoals(nested?.goals)
  ];

  const requestedId = clean(goalId);
  const requestedName = clean(name);
  const requestedKey = goalKey(requestedName);

  const match = goals.find((goal) => {
    if (requestedId && clean(goal?.id) === requestedId) return true;
    return requestedKey && goalKey(goalName(goal)) === requestedKey;
  });

  const fallbackName =
    requestedName ||
    goalName(context?.investorDNA?.goal) ||
    goalName(profile?.goal) ||
    "Financial Goal";

  return {
    id: clean(match?.id) || requestedId,
    name: goalName(match) || fallbackName,
    targetAmount:
      match?.targetAmount ?? match?.targetValue ?? match?.amount ?? null,
    targetDate: clean(match?.targetDate ?? match?.date),
    currency: clean(match?.currency) || "KES",
    priority: clean(match?.priority) || "MEDIUM"
  };
}

export async function saveCanonicalGoalDetails({
  goalId,
  name,
  targetAmount,
  targetDate
} = {}) {
  const normalizedName = clean(name);
  const normalizedAmount = Number(targetAmount);
  const normalizedDate = clean(targetDate);

  if (!normalizedName) {
    throw new Error("Goal name is required.");
  }

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("Enter a target amount greater than zero.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate || "")) {
    throw new Error("Enter the target date as YYYY-MM-DD.");
  }

  const parsedDate = new Date(`${normalizedDate}T00:00:00`);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== normalizedDate
  ) {
    throw new Error("Enter a valid calendar date.");
  }

  const context = await loadInvestorContext();
  const storedProfile = context?.storedProfile || {};
  const nested =
    storedProfile?.profile && typeof storedProfile.profile === "object"
      ? storedProfile.profile
      : {};

  const existingGoals = [
    ...safeGoals(storedProfile?.goals),
    ...safeGoals(nested?.goals)
  ];
  const requestedId = clean(goalId);
  const requestedKey = goalKey(normalizedName);
  let replaced = false;

  const updatedGoal = {
    id: requestedId || `GOAL_${requestedKey}`,
    name: normalizedName,
    targetAmount: normalizedAmount,
    targetDate: normalizedDate,
    currency: "KES",
    priority: "MEDIUM",
    source: "INVESTOR_PROFILE",
    updatedAt: new Date().toISOString()
  };

  const goals = existingGoals.map((goal) => {
    const matches =
      (requestedId && clean(goal?.id) === requestedId) ||
      goalKey(goalName(goal)) === requestedKey;

    if (!matches || replaced) return goal;
    replaced = true;
    return { ...goal, ...updatedGoal };
  });

  if (!replaced) goals.push(updatedGoal);

  const updatedProfile = {
    ...storedProfile,
    ...nested,
    goal:
      typeof storedProfile?.goal === "string"
        ? storedProfile.goal
        : normalizedName,
    goals
  };

  delete updatedProfile.profile;

  await userSetItem("investorProfile", JSON.stringify(updatedProfile));

  saveInvestorProfile(updatedProfile).catch((error) => {
    console.log("Goal details cloud sync deferred:", error?.message || error);
  });

  return updatedGoal;
}
