from swarms import Agent
from swarms.utils.litellm_wrapper import LiteLLM
from keys import next_gemini

def make_prd_agent() -> Agent:
    return Agent(
        agent_name="PRDAgent",
        llm=LiteLLM(
            model_name="gemini-2.0-flash",
            api_key=next_gemini(),
            temperature=0.3,
        ),
        system_prompt="""You are a Product Requirements Document (PRD) Agent.

Given an Idea Brief and Research Report, produce a full PRD with:
1. Product overview and goals
2. User personas
3. Feature list with acceptance criteria
4. API endpoint definitions (REST)
5. Database schema (tables, fields, relationships)
6. Frontend page list with component breakdown
7. Success metrics

Output clean markdown. This document will be handed directly to the Frontend and Backend agents.""",
        max_loops=1,
        verbose=False,
    )