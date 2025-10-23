from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import uvicorn
from main import main

class QueryRequest(BaseModel):
    query: str

class DocumentResponse(BaseModel):
    url: str
    title: str
    content: str
    published_date: str
    author: str

app = FastAPI()

@app.post("/regsearch", response_model=List[DocumentResponse])
async def search_docs(request: QueryRequest):
    results = await main(request.query)
    return results

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
