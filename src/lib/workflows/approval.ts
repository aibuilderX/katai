// ===== Approval State Machine =====
// Ringi-style approval workflow: creator -> reviewer -> approver
// Simple DB-driven transitions (no XState -- linear 3-step flow)

export type ApprovalStatus =
  | "draft"
  | "pending_review"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "revision_requested"

export type ApprovalAction =
  | "submit"
  | "approve"
  | "reject"
  | "request_revision"

/**
 * Valid state transitions map.
 * Each status maps to an array of statuses it can transition to.
 */
export const VALID_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  draft: ["pending_review"],
  pending_review: ["pending_approval", "revision_requested", "rejected"],
  pending_approval: ["approved", "revision_requested", "rejected"],
  approved: [], // terminal
  rejected: ["draft"], // can restart
  revision_requested: ["draft"], // creator revises, resubmits
}

/**
 * Check if a transition from one status to another is valid.
 */
export function canTransition(
  from: ApprovalStatus,
  to: ApprovalStatus
): boolean {
  const validTargets = VALID_TRANSITIONS[from]
  return validTargets.includes(to)
}

/**
 * Validate an approval action given the current status and user role.
 * Returns whether the action is allowed, the next status, and an error message if not allowed.
 *
 * Role mapping (from teamMembers.role):
 *   editor = creator (tantousha): can "submit"
 *   admin = reviewer + approver (kakarichou/buchou): can "approve", "reject", "request_revision"
 *   viewer = observer: no actions
 */
export function validateApprovalAction(
  currentStatus: ApprovalStatus,
  action: ApprovalAction,
  userRole: string
): { allowed: boolean; nextStatus: ApprovalStatus; error?: string } {
  // Viewers cannot take any action
  if (userRole === "viewer") {
    return {
      allowed: false,
      nextStatus: currentStatus,
      error: "閲覧者はアクションを実行できません",
    }
  }

  // Action-to-status mapping with role checks
  switch (action) {
    case "submit": {
      if (userRole !== "editor" && userRole !== "admin") {
        return {
          allowed: false,
          nextStatus: currentStatus,
          error: "提出権限がありません",
        }
      }
      if (
        currentStatus !== "draft" &&
        currentStatus !== "revision_requested" &&
        currentStatus !== "rejected"
      ) {
        return {
          allowed: false,
          nextStatus: currentStatus,
          error: "現在のステータスからは提出できません",
        }
      }
      // revision_requested and rejected go to draft first conceptually,
      // but we transition directly to pending_review for UX simplicity
      return { allowed: true, nextStatus: "pending_review" }
    }

    case "approve": {
      if (userRole !== "admin") {
        return {
          allowed: false,
          nextStatus: currentStatus,
          error: "承認権限がありません",
        }
      }
      if (currentStatus === "pending_review") {
        return { allowed: true, nextStatus: "pending_approval" }
      }
      if (currentStatus === "pending_approval") {
        return { allowed: true, nextStatus: "approved" }
      }
      return {
        allowed: false,
        nextStatus: currentStatus,
        error: "現在のステータスからは承認できません",
      }
    }

    case "reject": {
      if (userRole !== "admin") {
        return {
          allowed: false,
          nextStatus: currentStatus,
          error: "却下権限がありません",
        }
      }
      if (
        currentStatus !== "pending_review" &&
        currentStatus !== "pending_approval"
      ) {
        return {
          allowed: false,
          nextStatus: currentStatus,
          error: "現在のステータスからは却下できません",
        }
      }
      return { allowed: true, nextStatus: "rejected" }
    }

    case "request_revision": {
      if (userRole !== "admin") {
        return {
          allowed: false,
          nextStatus: currentStatus,
          error: "修正依頼権限がありません",
        }
      }
      if (
        currentStatus !== "pending_review" &&
        currentStatus !== "pending_approval"
      ) {
        return {
          allowed: false,
          nextStatus: currentStatus,
          error: "現在のステータスからは修正依頼できません",
        }
      }
      return { allowed: true, nextStatus: "revision_requested" }
    }

    default:
      return {
        allowed: false,
        nextStatus: currentStatus,
        error: "無効なアクションです",
      }
  }
}

/**
 * Japanese labels and colors for each approval status.
 */
export const APPROVAL_STATUS_LABELS: Record<
  ApprovalStatus,
  { labelJa: string; color: string }
> = {
  draft: { labelJa: "下書き", color: "gray" },
  pending_review: { labelJa: "レビュー待ち", color: "yellow" },
  pending_approval: { labelJa: "承認待ち", color: "orange" },
  approved: { labelJa: "承認済み", color: "green" },
  rejected: { labelJa: "却下", color: "red" },
  revision_requested: { labelJa: "修正依頼", color: "purple" },
}

/**
 * Japanese labels for approval actions (used in UI buttons and history).
 */
export const APPROVAL_ACTION_LABELS: Record<ApprovalAction, string> = {
  submit: "提出",
  approve: "承認",
  reject: "却下",
  request_revision: "修正依頼",
}
