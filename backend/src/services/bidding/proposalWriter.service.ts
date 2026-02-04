export interface ProposalSection {
  title: string;
  content: string;
}

export interface ProposalDraft {
  executiveSummary: string;
  approach: string;
  staffingPlan: string;
  timeline: string;
  pricingNotes: string;
}

export class ProposalWriterService {
  buildDraft(companyName: string, contractTitle: string): ProposalDraft {
    return {
      executiveSummary: `${companyName} is pleased to submit a response for ${contractTitle}. We bring a proven delivery track record and a dedicated customer success team.`,
      approach: `Our approach emphasizes discovery, rapid kickoff, and weekly progress reporting with stakeholder alignment.`,
      staffingPlan: `We will provide a delivery lead, technical specialists, and QA resources scaled to the scope.`,
      timeline: `Phase 1 (Weeks 1-2): onboarding and requirements. Phase 2 (Weeks 3-8): execution. Phase 3 (Weeks 9-10): closeout.`,
      pricingNotes: `Pricing includes transparent labor assumptions and contingency for risk mitigation.`
    };
  }

  toSections(draft: ProposalDraft): ProposalSection[] {
    return [
      { title: "Executive Summary", content: draft.executiveSummary },
      { title: "Technical Approach", content: draft.approach },
      { title: "Staffing Plan", content: draft.staffingPlan },
      { title: "Timeline", content: draft.timeline },
      { title: "Pricing Notes", content: draft.pricingNotes }
    ];
  }
}
