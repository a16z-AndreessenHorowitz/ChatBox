from pydantic import BaseModel, Field


class UploadSignatureRequest(BaseModel):
  original_filename: str = Field(min_length=1, max_length=500)
  content_type: str = Field(default="application/octet-stream", max_length=255)
  file_size: int = Field(gt=0)


class DocumentMetadata(BaseModel):
  public_id: str = Field(min_length=1, max_length=500)
  secure_url: str = Field(min_length=1, max_length=2000)
  original_filename: str = Field(min_length=1, max_length=500)
  file_size: int = Field(gt=0)


class DocumentMarkdownUpdate(BaseModel):
  markdown_content: str = Field(default="")
