export const HVAC_INTERNAL_CHECKLIST_VERSION = 1 as const;
export const HVAC_INTERNAL_CHECKLIST_VERTICAL = "hvac" as const;

export const HVAC_INTERNAL_CHECKLIST = [
  { id: "review_submission", label: "Review submitted HVAC onboarding", description: "Confirm the customer's submitted business and operating details.", required: true },
  { id: "business_profile", label: "Confirm HVAC business profile & services", description: "Make sure the profile, services, hours, and contact details are accurate.", required: true },
  { id: "ai_front_office", label: "Configure HVAC AI Front Office", description: "Tune the assistant to answer this HVAC business's questions correctly.", required: true },
  { id: "booking_configuration", label: "Configure HVAC booking services", description: "Set service types, availability, duration, buffers, and required fields.", required: true },
  { id: "google_calendar", label: "Connect Google Calendar", description: "Connect the calendar used for appointment availability and booking sync.", required: true },
  { id: "lead_capture", label: "Configure required lead-capture fields", description: "Confirm the HVAC intake captures the information the team needs.", required: true },
  { id: "website_installation", label: "Verify Avorlio website/chatbot installation", description: "Confirm the public website and chatbot surface are installed and usable.", required: true },
  { id: "booking_test", label: "Verify public booking flow", description: "Run a customer-style booking test from the public page.", required: true },
  { id: "crm_test", label: "Verify lead capture reaches CRM", description: "Confirm a test lead becomes visible in this workspace's CRM.", required: true },
  { id: "chatbot_test", label: "Verify HVAC AI Front Office", description: "Test HVAC answers, escalation, and booking handoff end to end.", required: true },
  { id: "email_integration", label: "Configure/verify email notifications", description: "Confirm required lead and booking emails are configured or intentionally handled.", required: false },
  { id: "sms_integration", label: "Configure/verify SMS/Twilio", description: "Confirm required SMS or voice routing is configured or intentionally handled.", required: false },
  { id: "client_access", label: "Invite HVAC owner/operator", description: "Give the customer operator access when handoff requires it.", required: false },
  { id: "final_smoke_test", label: "Run customer-specific final smoke test", description: "Verify the actual customer's public surfaces and responses before handoff.", required: true },
  { id: "handoff_complete", label: "Mark HVAC ready / handoff complete", description: "Manually confirm the agency is satisfied with the launch.", required: true },
] as const;

export type HvacInternalChecklistItemId = (typeof HVAC_INTERNAL_CHECKLIST)[number]["id"];

export type InternalChecklistItemState = {
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
};

export type InternalChecklistState = {
  version: typeof HVAC_INTERNAL_CHECKLIST_VERSION;
  vertical: typeof HVAC_INTERNAL_CHECKLIST_VERTICAL;
  items: Partial<Record<HvacInternalChecklistItemId, InternalChecklistItemState>>;
};

export type ChecklistViewItem = (typeof HVAC_INTERNAL_CHECKLIST)[number] & {
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
};

export type ManagedWorkspaceAccessInput = {
  workspace: { ownerId: string | null; parentUserId: string | null; parentAgencyId: string | null };
  userId: string;
  memberUserId?: string | null;
  agency?: { ownerUserId: string | null; ownerWorkspaceId: string | null } | null;
  agencyOwnerWorkspaceOwnerId?: string | null;
};

export function hasManagedWorkspaceAccess(input: ManagedWorkspaceAccessInput): boolean {
  if (input.workspace.ownerId === input.userId || input.workspace.parentUserId === input.userId) return true;
  if (input.memberUserId === input.userId) return true;
  if (!input.workspace.parentAgencyId || !input.agency) return false;
  if (input.agency.ownerUserId === input.userId) return true;
  return Boolean(input.agency.ownerWorkspaceId && input.agencyOwnerWorkspaceOwnerId === input.userId);
}

export function emptyHvacInternalChecklist(): InternalChecklistState {
  return {
    version: HVAC_INTERNAL_CHECKLIST_VERSION,
    vertical: HVAC_INTERNAL_CHECKLIST_VERTICAL,
    items: {},
  };
}

export function readHvacInternalChecklist(value: unknown): InternalChecklistState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyHvacInternalChecklist();
  const raw = value as Record<string, unknown>;
  if (raw.version !== HVAC_INTERNAL_CHECKLIST_VERSION || raw.vertical !== HVAC_INTERNAL_CHECKLIST_VERTICAL) {
    return emptyHvacInternalChecklist();
  }
  const rawItems = raw.items;
  const items: InternalChecklistState["items"] = {};
  if (rawItems && typeof rawItems === "object" && !Array.isArray(rawItems)) {
    for (const definition of HVAC_INTERNAL_CHECKLIST) {
      const candidate = (rawItems as Record<string, unknown>)[definition.id];
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
      const state = candidate as Record<string, unknown>;
      if (state.completed !== true) continue;
      items[definition.id] = {
        completed: true,
        ...(typeof state.completedAt === "string" ? { completedAt: state.completedAt } : {}),
        ...(typeof state.completedBy === "string" ? { completedBy: state.completedBy } : {}),
      };
    }
  }
  return { ...emptyHvacInternalChecklist(), items };
}

export function buildChecklistView(state: InternalChecklistState): ChecklistViewItem[] {
  return HVAC_INTERNAL_CHECKLIST.map((definition) => ({
    ...definition,
    completed: state.items[definition.id]?.completed === true,
    completedAt: state.items[definition.id]?.completedAt,
    completedBy: state.items[definition.id]?.completedBy,
  }));
}

export function summarizeChecklist(items: ChecklistViewItem[]) {
  return {
    completed: items.filter((item) => item.completed).length,
    total: items.length,
    requiredCompleted: items.filter((item) => item.required && item.completed).length,
    requiredTotal: items.filter((item) => item.required).length,
  };
}

export function isHvacOnboardingForm(form: { slug: string; name: string } | null | undefined): boolean {
  return form?.slug === "onboarding" && form.name === "Avorlio HVAC Onboarding";
}
