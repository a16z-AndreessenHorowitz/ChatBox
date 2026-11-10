from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status

from dependencies.auth import require_admin
from repositories.evaluation_repository import (
  approve_question,
  create_evaluation_run,
  delete_question,
  get_evaluation_run,
  get_question,
  list_ready_documents,
  list_evaluation_runs,
  list_questions,
  update_question,
)
from schemas.evaluation_schema import (
  EvaluationQuestionApproveRequest,
  EvaluationQuestionGenerateRequest,
  EvaluationQuestionUpdateRequest,
)
from services.evaluation_service import EvaluationServiceError, generate_question_candidates
from services.evaluation_run_service import run_evaluation_job

router = APIRouter(prefix="/admin/evaluation", tags=["RAG Evaluation"])


def _user_id(user: dict) -> int:
  try:
    return int(user["sub"])
  except (KeyError, TypeError, ValueError) as error:
    raise HTTPException(status_code=401, detail="Token không hợp lệ.") from error


@router.post("/questions/generate", status_code=status.HTTP_201_CREATED)
def generate_questions(
  payload: EvaluationQuestionGenerateRequest,
  current_user: dict = Depends(require_admin),
):
  try:
    return {
      "items": generate_question_candidates(
        document_id=payload.document_id,
        count=payload.count,
        created_by=_user_id(current_user),
      )
    }
  except EvaluationServiceError as error:
    raise HTTPException(status_code=error.status_code, detail=error.message) from error


@router.get("/questions")
def get_questions(
  status_filter: str | None = Query(default=None, alias="status", pattern="^(draft|approved)$"),
  _: dict = Depends(require_admin),
):
  return {"items": list_questions(status_filter)}


@router.get("/documents")
def get_documents_for_evaluation(_: dict = Depends(require_admin)):
  return {"items": list_ready_documents()}


@router.get("/questions/{question_id}")
def get_question_detail(question_id: int, _: dict = Depends(require_admin)):
  question = get_question(question_id)
  if question is None:
    raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")
  return question


@router.patch("/questions/{question_id}")
def edit_question(
  question_id: int,
  payload: EvaluationQuestionUpdateRequest,
  _: dict = Depends(require_admin),
):
  question = update_question(question_id, payload.question, payload.expected_answer)
  if question is None:
    existing = get_question(question_id)
    if existing is None:
      raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")
    raise HTTPException(status_code=409, detail="Chỉ có thể chỉnh sửa câu hỏi ở trạng thái draft.")
  return question


@router.post("/questions/{question_id}/approve")
def approve_evaluation_question(
  question_id: int,
  payload: EvaluationQuestionApproveRequest | None = None,
  current_user: dict = Depends(require_admin),
):
  embedding = payload.embedding if payload else None
  question = approve_question(question_id, _user_id(current_user), embedding)
  if question is None:
    existing = get_question(question_id)
    if existing is None:
      raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")
    raise HTTPException(
      status_code=409,
      detail="Câu hỏi đã được duyệt hoặc chưa có đáp án chuẩn.",
    )
  return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_question(question_id: int, _: dict = Depends(require_admin)):
  if not delete_question(question_id):
    existing = get_question(question_id)
    if existing is None:
      raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi.")
    raise HTTPException(status_code=409, detail="Chỉ có thể xóa câu hỏi ở trạng thái draft.")
  return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/runs", status_code=status.HTTP_202_ACCEPTED)
def start_evaluation_run(
  background_tasks: BackgroundTasks,
  current_user: dict = Depends(require_admin),
):
  run = create_evaluation_run(
    _user_id(current_user),
    config={"retrieval_top_k": 5, "generator": "Gemini", "judge": "Gemini"},
  )
  if run is None:
    raise HTTPException(status_code=409, detail="Cần duyệt ít nhất một câu hỏi trước khi chạy đánh giá.")
  background_tasks.add_task(run_evaluation_job, run["id"], run["question_ids"])
  return {key: value for key, value in run.items() if key != "question_ids"}


@router.get("/runs")
def get_evaluation_runs(_: dict = Depends(require_admin)):
  return {"items": list_evaluation_runs()}


@router.get("/runs/{run_id}")
def get_evaluation_run_detail(run_id: int, _: dict = Depends(require_admin)):
  run = get_evaluation_run(run_id)
  if run is None:
    raise HTTPException(status_code=404, detail="Không tìm thấy lần đánh giá.")
  return run
