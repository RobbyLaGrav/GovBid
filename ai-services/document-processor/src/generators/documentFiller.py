from __future__ import annotations

from dataclasses import dataclass


@dataclass
class DocumentFiller:
    placeholder_token: str = "{{content}}"

    def fill_template(self, content: str, template: str | None = None) -> str:
        if not template:
            template = "GovBid Proposal\n\n{{content}}\n\n-- End of Document --"
        return template.replace(self.placeholder_token, content)
