from pydantic import BaseModel, HttpUrl

class GeneratePromptRequest(BaseModel):
    imageBase64: str # data:image/jpeg;base64,...

class TransformImageRequest(BaseModel):
    imageBase64: str
    prompt: str

