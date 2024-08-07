from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import T5Tokenizer, T5ForConditionalGeneration, pipeline, AutoTokenizer, TFAutoModelForQuestionAnswering
from sentence_transformers import SentenceTransformer, util
import torch

# Initialize tokenizer and model for summarization
summarization_tokenizer = T5Tokenizer.from_pretrained("t5-base")
summarization_model = T5ForConditionalGeneration.from_pretrained("t5-base")

# Initialize QA pipeline for text-based QA using BERT
tokenizer = AutoTokenizer.from_pretrained("bert-large-uncased-whole-word-masking-finetuned-squad")
model = TFAutoModelForQuestionAnswering.from_pretrained("bert-large-uncased-whole-word-masking-finetuned-squad")
qa_pipeline = pipeline("question-answering", model=model, tokenizer=tokenizer)

# Initialize smart search model
search_model = SentenceTransformer('all-MiniLM-L6-v2')

app = FastAPI()

# Enable CORS
origins = ['http://localhost:3000']
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Summarization endpoint
@app.post('/summarize/')
async def summarize(file: UploadFile = File(...)):
    contents = await file.read()
    text = contents.decode('utf-8')
    inputs = summarization_tokenizer.encode("summarize: " + text, return_tensors="pt", max_length=512, truncation=True)
    summary_ids = summarization_model.generate(inputs, max_length=150, min_length=40, length_penalty=2.0, num_beams=4, early_stopping=True)
    summary = summarization_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    return {"summary": summary}

# Question Answering endpoint
class QAInput(BaseModel):
    question: str
    context: str

@app.post('/qa/')
async def answer_question(file: UploadFile = File(...), question: str = ""):
    contents = await file.read()
    text = contents.decode('utf-8')
    answer = qa_pipeline(question=question, context=text)
    return {"answer": answer['answer']}

# Smart Search endpoint
class SearchInput(BaseModel):
    query: str
    documents: list

@app.post('/search/')
def smart_search(data: SearchInput):
    query = data.query
    documents = data.documents
    if not documents:
        raise HTTPException(status_code=400, detail="No documents provided for search.")
    
    query_embedding = search_model.encode(query, convert_to_tensor=True)
    doc_embeddings = search_model.encode(documents, convert_to_tensor=True)

    # Compute cosine similarities between the query and all document embeddings
    similarities = util.pytorch_cos_sim(query_embedding, doc_embeddings)
    closest_idx = torch.argmax(similarities).item()
    closest_doc = documents[closest_idx]
    return {"document": closest_doc, "similarity": similarities[0, closest_idx].item()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
