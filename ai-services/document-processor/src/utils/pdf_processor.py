from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass
class PdfSection:
    title: str
    content: str


def split_pdf_text(text: str) -> List[PdfSection]:
    """Naive PDF text splitter that groups by heading-style lines."""
    sections: List[PdfSection] = []
    current_title = "Overview"
    buffer: List[str] = []

    for line in text.splitlines():
        stripped = line.strip()
        if stripped.isupper() and len(stripped) > 3:
            if buffer:
                sections.append(PdfSection(title=current_title, content="\n".join(buffer)))
                buffer = []
            current_title = stripped.title()
        else:
            buffer.append(stripped)

    if buffer:
        sections.append(PdfSection(title=current_title, content="\n".join(buffer)))

    return sections
