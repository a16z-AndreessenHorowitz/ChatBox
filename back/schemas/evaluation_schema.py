from pydantic import BaseModel, Field, field_validator


class EvaluationQuestionGenerateRequest(BaseModel):
  document_id: int = Field(gt=0)
  count: int = Field(default=10, ge=1, le=20)


class EvaluationQuestionUpdateRequest(BaseModel):
  question: str = Field(min_length=1)
  expected_answer: str | None = None

  @field_validator("question")
  @classmethod
  def question_must_not_be_blank(cls, value: str) -> str:
    value = value.strip()
    if not value:
      raise ValueError("Câu hỏi không được để trống.")
    return value


class EvaluationQuestionApproveRequest(BaseModel):
  embedding: list[float] | None = Field(default=None, min_length=384, max_length=384)


class EvaluationQuestionResponse(BaseModel):
  id: int
  question: str
  expected_answer: str | None
  source_document_id: int | None
  source_document_name: str | None = None
  status: str
  created_by: int | None
  reviewed_by: int | None
  created_at: str
  updated_at: str
  approved_at: str | None
  sources: list[dict] = Field(default_factory=list)
