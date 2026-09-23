"""Shared, persistent leaderboard for games played independently."""
from datetime import datetime, timezone
import math
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .database import connect, execute

router = APIRouter(prefix="/api/leaderboard")


class Answer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    targetMidi: int = Field(ge=60, le=72, strict=True)
    chosenMidi: int | None = Field(default=None, ge=60, le=72, strict=True)
    timeTakenSec: float = Field(ge=0.2, le=10, allow_inf_nan=False)


class Submission(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    name: str = Field(min_length=1, max_length=12)
    difficulty: Literal["standard", "advanced"]
    answerMode: Literal["choice", "voice"]
    allowDuplicates: bool
    practice: bool = False
    answers: list[Answer] = Field(min_length=1, max_length=20)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value):
        value = value.strip()
        if not value or any(ord(c) < 32 for c in value):
            raise ValueError("名前を入力してください。")
        return value

    @model_validator(mode="after")
    def validate_notes(self):
        targets = [a.targetMidi for a in self.answers]
        if not self.allowDuplicates and len(set(targets)) != len(targets):
            raise ValueError("重複なしのゲームに同じ出題音があります。")
        if self.difficulty == "standard" and any(n not in {60, 62, 64, 65, 67, 69, 71, 72} for n in targets):
            raise ValueError("標準モードの出題音が不正です。")
        return self


def score(submission: Submission) -> dict:
    total = perfect = streak = max_streak = 0
    for answer in submission.answers:
        if answer.chosenMidi is None:
            streak = 0
            continue
        diff = abs(answer.targetMidi - answer.chosenMidi)
        total += {0: 1000, 1: 700, 2: 400, 3: 200}.get(diff, 50)
        if diff <= 2:
            total += math.floor((10 - answer.timeTakenSec) / 10 * 500 + 0.5)
        if diff == 0:
            perfect += 1
            streak += 1
            total += {1: 0, 2: 200, 3: 450, 4: 800}.get(streak, 1500)
        elif diff != 1:
            streak = 0
        max_streak = max(max_streak, streak)
    return dict(totalScore=total, perfectCount=perfect, maxStreak=max_streak,
                averageTimeSec=round(sum(a.timeTakenSec for a in submission.answers) / len(submission.answers), 1))



@router.post("")
def save_entry(submission: Submission):
    entry = dict(id=str(submission.id), name=submission.name, difficulty=submission.difficulty,
                 answerMode=submission.answerMode, questionCount=len(submission.answers),
                 allowDuplicates=int(submission.allowDuplicates), practice=int(submission.practice),
                 **score(submission), date=datetime.now(timezone.utc).isoformat())
    connection = connect()
    try:
        with connection:
            execute(connection, """INSERT INTO entries (id, name, difficulty, "answerMode", "questionCount", "allowDuplicates", practice, "totalScore", "perfectCount", "maxStreak", "averageTimeSec", date) VALUES
                (:id, :name, :difficulty, :answerMode, :questionCount, :allowDuplicates,
                 :practice, :totalScore, :perfectCount, :maxStreak, :averageTimeSec, :date)
                ON CONFLICT(id) DO NOTHING""", entry)
            saved = dict(execute(connection, "SELECT * FROM entries WHERE id = :id", {"id": entry["id"]}).fetchone())
            if any(saved[key] != value for key, value in entry.items() if key != 'date'):
                raise HTTPException(status_code=409, detail="このゲームの結果は既に登録されています。")
            return saved
    finally:
        connection.close()


@router.get("")
def list_entries(difficulty: Literal["standard", "advanced"] = "standard",
                 answerMode: Literal["choice", "voice"] = "choice",
                 questionCount: int = Query(default=5, ge=1, le=20),
                 allowDuplicates: bool = False, practice: bool = False):
    connection = connect()
    try:
        return [dict(row) for row in execute(connection, """SELECT * FROM entries
            WHERE difficulty=:difficulty AND "answerMode"=:answerMode AND "questionCount"=:questionCount
            AND "allowDuplicates"=:allowDuplicates AND practice=:practice
            ORDER BY "totalScore" DESC, "averageTimeSec" ASC, date ASC LIMIT 50""",
            dict(difficulty=difficulty, answerMode=answerMode, questionCount=questionCount,
                 allowDuplicates=int(allowDuplicates), practice=int(practice)))]
    finally:
        connection.close()
