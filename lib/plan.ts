export type Plan =
  | "starter"
  | "pro"
  | "premium";

export type PlanFeature =
  | "digital_menu"
  | "qr"
  | "nfc"
  | "orders"
  | "waiter_call"
  | "analytics"
  | "multi_user"
  | "advanced_reports";

const PLAN_FEATURES: Record<
  Plan,
  readonly PlanFeature[]
> = {
  starter: [
    "digital_menu",
    "qr",
  ],

  pro: [
    "digital_menu",
    "qr",
    "nfc",
    "orders",
    "waiter_call",
    "analytics",
    "multi_user",
  ],

  premium: [
    "digital_menu",
    "qr",
    "nfc",
    "orders",
    "waiter_call",
    "analytics",
    "multi_user",
    "advanced_reports",
  ],
};

const PLAN_LABELS: Record<Plan, string> = {
  starter: "STARTER",
  pro: "PRO",
  premium: "PREMIUM",
};

export function normalizePlan(
  value: unknown
): Plan {
  if (value === "premium") {
    return "premium";
  }

  if (value === "pro") {
    return "pro";
  }

  return "starter";
}

export function hasPlanFeature(
  plan: unknown,
  feature: PlanFeature
): boolean {
  const normalizedPlan =
    normalizePlan(plan);

  return PLAN_FEATURES[
    normalizedPlan
  ].includes(feature);
}

export function getPlanFeatures(
  plan: unknown
): PlanFeature[] {
  const normalizedPlan =
    normalizePlan(plan);

  return [
    ...PLAN_FEATURES[
      normalizedPlan
    ],
  ];
}

export function getPlanLabel(
  plan: unknown
): string {
  return PLAN_LABELS[
    normalizePlan(plan)
  ];
}

export function isStarter(
  plan: unknown
): boolean {
  return normalizePlan(plan) === "starter";
}

export function isProOrHigher(
  plan: unknown
): boolean {
  const normalizedPlan =
    normalizePlan(plan);

  return (
    normalizedPlan === "pro" ||
    normalizedPlan === "premium"
  );
}

export function isPremium(
  plan: unknown
): boolean {
  return (
    normalizePlan(plan) ===
    "premium"
  );
}

export function requirePlanFeature(
  plan: unknown,
  feature: PlanFeature
): void {
  if (!hasPlanFeature(plan, feature)) {
    const label =
      getPlanLabel(plan);

    throw new Error(
      `${label} paketi bu özelliği desteklemiyor.`
    );
  }
}
