from pydantic import BaseModel


class QuestionOption(BaseModel):
    value: str
    label: str


class Question(BaseModel):
    id: str
    step: int
    text: str
    type: str  # "number", "select", "multi_select"
    options: list[QuestionOption] = []
    required: bool = True
    show_if: dict | None = None  # {"field": "value"} conditional


class QuestionnaireResponse(BaseModel):
    questions: list[Question]


class QuestionnaireSubmission(BaseModel):
    responses: dict  # {question_id: value}
