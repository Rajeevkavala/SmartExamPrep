from pydantic import BaseModel


class SyllabusUploadResponse(BaseModel):
    upload_id: str
    filename: str
    status: str
    extracted_structure: dict | None
    subjects_imported: int
    topics_imported: int
    error_message: str | None = None
    created_at: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "upload_id": "b4ea2884-1ac7-47f7-a542-8636d33657c7",
                "filename": "gate_cse_syllabus.pdf",
                "status": "done",
                "extracted_structure": {
                    "subjects": [
                        {
                            "name": "Operating Systems",
                            "topics": [
                                {
                                    "name": "CPU Scheduling",
                                    "subtopics": ["FCFS", "SJF", "Round Robin"],
                                }
                            ],
                        }
                    ]
                },
                "subjects_imported": 1,
                "topics_imported": 1,
                "error_message": None,
                "created_at": "2026-04-03T12:00:00",
            }
        }
    }


class ImportSyllabusRequest(BaseModel):
    structure: dict | None = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "structure": {
                    "subjects": [
                        {
                            "name": "Operating Systems",
                            "topics": [
                                {
                                    "name": "CPU Scheduling",
                                    "subtopics": ["FCFS", "SJF", "Round Robin"],
                                }
                            ],
                        }
                    ]
                }
            }
        }
    }
