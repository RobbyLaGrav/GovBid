from fastapi import FastAPI, UploadFile
from pydantic import BaseModel

from src.analyzers.complianceChecker import ComplianceChecker
from src.analyzers.requirementExtractor import RequirementExtractor
from src.analyzers.solicitationAnalyzer import SolicitationAnalyzer
from src.generators.bomGenerator import BOMGenerator
from src.generators.documentFiller import DocumentFiller
from src.generators.proposalGenerator import ProposalGenerator
from src.utils.text_extractor import extract_text

app = FastAPI(title="GovBid Document Processor", version="0.1.0")

compliance_checker = ComplianceChecker()
requirement_extractor = RequirementExtractor()
solicitation_analyzer = SolicitationAnalyzer()
bom_generator = BOMGenerator()
proposal_generator = ProposalGenerator()
document_filler = DocumentFiller()


class AnalyzeResponse(BaseModel):
    summary: str
    requirements: list[str]
    compliance: dict[str, bool]
    risk_score: float


class ProposalRequest(BaseModel):
    solicitation_text: str
    company_name: str
    capability_statement: str


class ProposalResponse(BaseModel):
    proposal: str
    bom: list[dict]


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_document(file: UploadFile) -> AnalyzeResponse:
    content = await file.read()
    text = extract_text(content)

    requirements = requirement_extractor.extract(text)
    compliance = compliance_checker.evaluate(requirements)
    summary, risk_score = solicitation_analyzer.summarize(text, compliance)

    return AnalyzeResponse(
        summary=summary,
        requirements=requirements,
        compliance=compliance,
        risk_score=risk_score,
    )


@app.post("/generate/proposal", response_model=ProposalResponse)
async def generate_proposal(payload: ProposalRequest) -> ProposalResponse:
    proposal = proposal_generator.generate(
        solicitation_text=payload.solicitation_text,
        company_name=payload.company_name,
        capability_statement=payload.capability_statement,
    )
    bom = bom_generator.generate(payload.solicitation_text)
    filled = document_filler.fill_template(proposal)

    return ProposalResponse(proposal=filled, bom=bom)
