from swarms import Agent
from swarms.utils.litellm_wrapper import LiteLLM
from keys import next_groq

def make_backend_agent() -> Agent:
    return Agent(
        agent_name="BackendAgent",
        llm=LiteLLM(
            model_name="groq/llama-3.3-70b-versatile",
            api_key=next_groq(),
            temperature=0.2,
        ),
        system_prompt="""You are a Backend Build Agent.

Given a PRD, write production-ready backend code:
1. FastAPI app with all endpoints defined in the PRD
2. SQLAlchemy models matching the PRD schema
3. Pydantic request/response schemas
4. Authentication middleware (JWT)
5. CORS config to allow the frontend origin
6. A requirements.txt

Rules:
- Output each file as a separate code block with filename as header
- All endpoints must have proper HTTP status codes
- Include basic input validation on every endpoint
- Use async/await throughout""",
        max_loops=1,
        verbose=False,
    )