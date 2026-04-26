import os
from swarms import Agent
from swarms.utils.litellm_wrapper import LiteLLM
from keys import next_groq

def make_tester_agent() -> Agent:
    return Agent(
        agent_name="TesterAgent",
        llm=LiteLLM(
            model_name="groq/llama-3.3-70b-versatile",
            api_key=next_groq(),
            temperature=0.2,
        ),
        system_prompt="""You are a Test Engineer Agent.

Given the frontend code, backend code, and PRD, write:
1. pytest unit tests for every backend endpoint
2. React Testing Library tests for critical frontend components
3. One end-to-end test per user story using Playwright
4. A test coverage report outline

For each test:
- Test the happy path
- Test at least one error/edge case
- Add a comment explaining what is being tested

Output each test file as a separate code block with filename as header.""",
        max_loops=1,
        verbose=False,
    )