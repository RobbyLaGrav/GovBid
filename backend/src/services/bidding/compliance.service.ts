export interface ComplianceItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
}

export class ComplianceService {
  private checklist: ComplianceItem[] = [
    { id: "form-sf33", label: "SF33 form completed", required: true, completed: false },
    { id: "sam-registration", label: "SAM registration active", required: true, completed: false },
    { id: "pricing-sheet", label: "Pricing worksheet attached", required: true, completed: false },
    { id: "past-performance", label: "Past performance summaries", required: false, completed: false }
  ];

  list(): ComplianceItem[] {
    return this.checklist.map((item) => ({ ...item }));
  }

  update(itemId: string, completed: boolean): ComplianceItem | undefined {
    const item = this.checklist.find((entry) => entry.id === itemId);
    if (!item) return undefined;
    item.completed = completed;
    return { ...item };
  }

  isCompliant(): boolean {
    return this.checklist.filter((item) => item.required).every((item) => item.completed);
  }
}
