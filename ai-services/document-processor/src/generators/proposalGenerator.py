from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ProposalGenerator:
    def generate(self, solicitation_text: str, company_name: str, capability_statement: str) -> str:
        return (
            f"Proposal for {company_name}\n"
            "=============================\n\n"
            "Executive Summary\n"
            f"{company_name} appreciates the opportunity to respond. "
            "We provide tailored delivery aligned to solicitation priorities.\n\n"
            "Capabilities\n"
            f"{capability_statement}\n\n"
            "Approach\n"
            "- Requirements review and compliance mapping\n"
            "- Project management with weekly status reporting\n"
            "- Dedicated customer success lead\n\n"
            "Solicitation Highlights\n"
            f"{solicitation_text[:500]}\n"
        )
