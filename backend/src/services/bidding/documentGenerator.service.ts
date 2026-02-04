import { ProposalSection } from "./proposalWriter.service.js";

export interface DocumentBundle {
  id: string;
  sections: ProposalSection[];
  generatedAt: string;
  format: "markdown" | "pdf";
  payload: string;
}

export class DocumentGeneratorService {
  generateMarkdown(sections: ProposalSection[]): DocumentBundle {
    const payload = sections
      .map((section) => `## ${section.title}\n\n${section.content}`)
      .join("\n\n");

    return {
      id: `doc_${Date.now()}`,
      sections,
      generatedAt: new Date().toISOString(),
      format: "markdown",
      payload
    };
  }

  generatePdf(sections: ProposalSection[]): DocumentBundle {
    const payload = sections
      .map((section) => `${section.title.toUpperCase()}\n${section.content}`)
      .join("\n\n---\n\n");

    return {
      id: `doc_${Date.now()}`,
      sections,
      generatedAt: new Date().toISOString(),
      format: "pdf",
      payload
    };
  }
}
