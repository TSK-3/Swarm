import os
from swarms import Agent
from swarms.utils.litellm_wrapper import LiteLLM
from keys import next_gemini

def make_supervisor() -> Agent:
    # Set GOOGLE_API_KEY for litellm to use Google Generative AI
    os.environ["GOOGLE_API_KEY"] = next_gemini()
    
    return Agent(
        agent_name="Supervisor",
        llm=LiteLLM(
            model_name="google/gemini-pro",
            temperature=0.2,
        ),
        system_prompt="""You are the Supervisor Agent for an autonomous SaaS builder swarm.

Your job:
1. Review each agent's output before passing it to the next agent
2. Check that outputs are complete and match what was asked
3. If an output is incomplete or wrong, return it to the agent with specific feedback
4. Track which stage the pipeline is at
5. Write a final summary of everything built

You receive outputs tagged like: [IDEA_OUTPUT], [RESEARCH_OUTPUT], [PRD_OUTPUT], [FRONTEND_OUTPUT], [BACKEND_OUTPUT], [TEST_OUTPUT]

For each, respond with either:
- APPROVED: <brief reason> — to pass it forward
- REVISION NEEDED: <specific list of what's missing> — to send back

Be strict. Incomplete outputs shipped downstream cause cascading failures.""",
        max_loops=2,
        verbose=True,
    )