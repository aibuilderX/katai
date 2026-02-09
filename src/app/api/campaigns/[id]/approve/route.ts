import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import {
  campaigns,
  teamMembers,
  approvalWorkflows,
  approvalHistory,
  profiles,
} from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import {
  validateApprovalAction,
  type ApprovalAction,
  type ApprovalStatus,
} from "@/lib/workflows/approval"

/**
 * GET /api/campaigns/[id]/approve
 * Fetch the approval workflow and history for a campaign.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { id: campaignId } = await params

    // Verify user has access to this campaign's team
    const membership = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, user.id))
      .limit(1)

    if (membership.length === 0) {
      return NextResponse.json(
        { error: "チームが見つかりません" },
        { status: 403 }
      )
    }

    const teamId = membership[0].teamId

    // Verify campaign belongs to user's team
    const campaignResult = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.teamId, teamId)))
      .limit(1)

    if (campaignResult.length === 0) {
      return NextResponse.json(
        { error: "キャンペーンが見つかりません" },
        { status: 404 }
      )
    }

    // Fetch workflow
    const workflowResult = await db
      .select()
      .from(approvalWorkflows)
      .where(eq(approvalWorkflows.campaignId, campaignId))
      .limit(1)

    if (workflowResult.length === 0) {
      return NextResponse.json({ workflow: null, history: [] })
    }

    const workflow = workflowResult[0]

    // Fetch history with actor display names
    const historyResult = await db
      .select({
        id: approvalHistory.id,
        action: approvalHistory.action,
        fromStatus: approvalHistory.fromStatus,
        toStatus: approvalHistory.toStatus,
        actorId: approvalHistory.actorId,
        actorName: profiles.displayName,
        actorEmail: profiles.email,
        comment: approvalHistory.comment,
        createdAt: approvalHistory.createdAt,
      })
      .from(approvalHistory)
      .leftJoin(profiles, eq(approvalHistory.actorId, profiles.id))
      .where(eq(approvalHistory.workflowId, workflow.id))
      .orderBy(approvalHistory.createdAt)

    return NextResponse.json({
      workflow: {
        ...workflow,
        createdAt: workflow.createdAt?.toISOString() || null,
        updatedAt: workflow.updatedAt?.toISOString() || null,
        submittedAt: workflow.submittedAt?.toISOString() || null,
        reviewedAt: workflow.reviewedAt?.toISOString() || null,
        approvedAt: workflow.approvedAt?.toISOString() || null,
      },
      history: historyResult.map((h) => ({
        ...h,
        actorName: h.actorName || h.actorEmail || "不明",
        createdAt: h.createdAt?.toISOString() || null,
      })),
    })
  } catch (error) {
    console.error("[approve/GET] Error:", error)
    return NextResponse.json(
      { error: "承認情報の取得に失敗しました" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/campaigns/[id]/approve
 * Execute an approval action (submit, approve, reject, request_revision).
 * Uses optimistic locking to prevent race conditions.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { id: campaignId } = await params
    const body = await request.json()
    const { action, comment } = body as {
      action: ApprovalAction
      comment?: string
    }

    if (!action) {
      return NextResponse.json(
        { error: "アクションを指定してください" },
        { status: 400 }
      )
    }

    // Fetch user's team membership to get role
    const membership = await db
      .select({
        teamId: teamMembers.teamId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, user.id))
      .limit(1)

    if (membership.length === 0) {
      return NextResponse.json(
        { error: "チームが見つかりません" },
        { status: 403 }
      )
    }

    const { teamId, role: userRole } = membership[0]

    // Verify campaign belongs to user's team
    const campaignResult = await db
      .select({ id: campaigns.id, approvalStatus: campaigns.approvalStatus })
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.teamId, teamId)))
      .limit(1)

    if (campaignResult.length === 0) {
      return NextResponse.json(
        { error: "キャンペーンが見つかりません" },
        { status: 404 }
      )
    }

    // Fetch or create approval workflow
    let workflowResult = await db
      .select()
      .from(approvalWorkflows)
      .where(eq(approvalWorkflows.campaignId, campaignId))
      .limit(1)

    if (workflowResult.length === 0) {
      // Create a new workflow with status "draft"
      const newWorkflow = await db
        .insert(approvalWorkflows)
        .values({
          campaignId,
          status: "draft",
          version: 1,
        })
        .returning()

      workflowResult = newWorkflow
    }

    const workflow = workflowResult[0]
    const currentStatus = workflow.status as ApprovalStatus

    // Validate the action
    const validation = validateApprovalAction(currentStatus, action, userRole)

    if (!validation.allowed) {
      return NextResponse.json(
        { error: validation.error },
        { status: 403 }
      )
    }

    const nextStatus = validation.nextStatus

    // Build update fields based on action
    const updateFields: Record<string, unknown> = {
      status: nextStatus,
      version: workflow.version + 1,
      updatedAt: new Date(),
    }

    if (action === "submit") {
      updateFields.submittedBy = user.id
      updateFields.submittedAt = new Date()
    } else if (action === "approve" && currentStatus === "pending_review") {
      updateFields.reviewedBy = user.id
      updateFields.reviewedAt = new Date()
      updateFields.reviewComment = comment || null
    } else if (action === "approve" && currentStatus === "pending_approval") {
      updateFields.approvedBy = user.id
      updateFields.approvedAt = new Date()
      updateFields.approvalComment = comment || null
    } else if (action === "reject" || action === "request_revision") {
      // For reject/revision from review stage, store in reviewed fields
      if (currentStatus === "pending_review") {
        updateFields.reviewedBy = user.id
        updateFields.reviewedAt = new Date()
        updateFields.reviewComment = comment || null
      } else {
        // From approval stage
        updateFields.approvedBy = user.id
        updateFields.approvedAt = new Date()
        updateFields.approvalComment = comment || null
      }
    }

    // Optimistic locking: UPDATE only if version matches
    const updated = await db
      .update(approvalWorkflows)
      .set(updateFields)
      .where(
        and(
          eq(approvalWorkflows.id, workflow.id),
          eq(approvalWorkflows.version, workflow.version)
        )
      )
      .returning()

    if (updated.length === 0) {
      return NextResponse.json(
        {
          error:
            "承認状態が変更されています。ページを更新してください。",
        },
        { status: 409 }
      )
    }

    // Insert into approval history
    await db.insert(approvalHistory).values({
      workflowId: workflow.id,
      action,
      fromStatus: currentStatus,
      toStatus: nextStatus,
      actorId: user.id,
      comment: comment || null,
    })

    // Update denormalized approvalStatus on campaigns table
    await db
      .update(campaigns)
      .set({ approvalStatus: nextStatus })
      .where(eq(campaigns.id, campaignId))

    // Fetch updated workflow + history for response
    const updatedWorkflow = updated[0]

    const historyResult = await db
      .select({
        id: approvalHistory.id,
        action: approvalHistory.action,
        fromStatus: approvalHistory.fromStatus,
        toStatus: approvalHistory.toStatus,
        actorId: approvalHistory.actorId,
        actorName: profiles.displayName,
        actorEmail: profiles.email,
        comment: approvalHistory.comment,
        createdAt: approvalHistory.createdAt,
      })
      .from(approvalHistory)
      .leftJoin(profiles, eq(approvalHistory.actorId, profiles.id))
      .where(eq(approvalHistory.workflowId, workflow.id))
      .orderBy(approvalHistory.createdAt)

    return NextResponse.json({
      workflow: {
        ...updatedWorkflow,
        createdAt: updatedWorkflow.createdAt?.toISOString() || null,
        updatedAt: updatedWorkflow.updatedAt?.toISOString() || null,
        submittedAt: updatedWorkflow.submittedAt?.toISOString() || null,
        reviewedAt: updatedWorkflow.reviewedAt?.toISOString() || null,
        approvedAt: updatedWorkflow.approvedAt?.toISOString() || null,
      },
      history: historyResult.map((h) => ({
        ...h,
        actorName: h.actorName || h.actorEmail || "不明",
        createdAt: h.createdAt?.toISOString() || null,
      })),
    })
  } catch (error) {
    console.error("[approve/POST] Error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "承認処理に失敗しました",
      },
      { status: 500 }
    )
  }
}
