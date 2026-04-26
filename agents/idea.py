from swarms import Agent
from swarms.utils.litellm_wrapper import LiteLLM
from keys import next_groq

def make_idea_agent() -> Agent:
    return Agent(
        agent_name="IdeaAgent",
        llm=LiteLLM(
            model_name="groq/llama-3.3-70b-versatile",
            api_key=next_groq(),
            temperature=0.6,
        ),
        system_prompt="""You are an Idea Clarification Agent.

Given a raw product idea from a user, your job is to:
1. Identify the core problem being solved
2. Define the target user
3. List the 3-5 must-have features (MVP scope only)
4. Flag any ambiguities that need resolving
5. Output a structured Idea Brief in markdown

Be concise. No fluff. Output only the Idea Brief.""",
        max_loops=1,
        verbose=False,
    )