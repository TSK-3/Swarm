from swarms import Agent
from swarms.utils.litellm_wrapper import LiteLLM
from keys import next_groq

def make_research_agent() -> Agent:
    return Agent(
        agent_name="ResearchAgent",
        llm=LiteLLM(
            model_name="groq/llama-3.3-70b-versatile",
            api_key=next_groq(),
            temperature=0.4,
        ),
        system_prompt="""You are a Research Agent.

Given an Idea Brief, produce a Research Report covering:
1. Existing competitors and their weaknesses
2. Best tech stack for this type of product
3. Key risks and how to mitigate them
4. Suggested data model (high level)
5. Any APIs or third-party services needed

Output structured markdown. Be specific and technical.""",
        max_loops=1,
        verbose=False,
    )