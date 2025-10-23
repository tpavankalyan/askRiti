from dotenv import load_dotenv
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.agent.workflow import FunctionAgent
from llama_index.llms.openai import OpenAI
from llama_index.vector_stores.pinecone import PineconeVectorStore
import asyncio
from llama_index.core.query_engine import CitationQueryEngine
import os
from pinecone import Pinecone, ServerlessSpec


# Load environment variables from .env file
load_dotenv(".env.local")
api_key = os.environ["PINECONE_API_KEY"]

pc = Pinecone(api_key=api_key)
pinecone_index = pc.Index("cdsco")
vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
index = VectorStoreIndex.from_vector_store(vector_store)
# query_engine = index.as_query_engine()
query_engine = CitationQueryEngine.from_args(
    index,
    citation_chunk_size=1024,
    similarity_top_k=5,
)

async def search_documents(query: str) -> str:
    """Useful for answering natural language questions about Regulations present in CDSCO"""
    response = await query_engine.aquery(query)
    print(response.source_nodes[0].node.get_text())
    return str(response)


# Now we can ask questions about the documents or do calculations
async def main(query):
    # Retrieve relevant documents based on the query
    retrieved_nodes = await query_engine.aretrieve(query)
    print("Retrieved Documents:\n")
    response = []
    for node in retrieved_nodes:
        response.append({
            "url": node.metadata['file_path'],
            "title": "",
            "content": node.node.get_text(),
            "published_date": node.metadata['last_modified_date'],
            "author": "cdsco"
        })
    return response

# Run the agent
if __name__ == "__main__":
    query = "what is the meaning of fermions?"
    asyncio.run(main(query))
