import os
import sys
import traceback

try:
    from agents.orch import make_supervisor
    from agents.idea import make_idea_agent
    from agents.res import make_research_agent
    from agents.prd import make_prd_agent
    from agents.front import make_frontend_agent
    from agents.back import make_backend_agent
    from agents.test import make_tester_agent
except Exception as e:
    print(f"ERROR importing agents: {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    raise

os.makedirs("output", exist_ok=True)

def save(filename: str, content: str):
    with open(f"output/{filename}", "w") as f:
        f.write(content)
    print(f"  Saved → output/{filename}")

def run_swarm(idea: str):
    supervisor    = make_supervisor()
    idea_agent    = make_idea_agent()
    research_agent = make_research_agent()
    prd_agent     = make_prd_agent()
    frontend_agent = make_frontend_agent()
    backend_agent = make_backend_agent()
    tester_agent  = make_tester_agent()

    print("\n[1/6] Idea agent clarifying...")
    idea_brief = idea_agent.run(idea)
    save("idea_brief.md", idea_brief)
    supervisor.run(f"[IDEA_OUTPUT]\n{idea_brief}")

    print("\n[2/6] Research agent analyzing...")
    research = research_agent.run(f"Idea Brief:\n{idea_brief}")
    save("research.md", research)
    supervisor.run(f"[RESEARCH_OUTPUT]\n{research}")

    print("\n[3/6] PRD agent writing spec...")
    prd = prd_agent.run(f"Idea Brief:\n{idea_brief}\n\nResearch:\n{research}")
    save("prd.md", prd)
    supervisor.run(f"[PRD_OUTPUT]\n{prd}")

    print("\n[4/6] Frontend + Backend agents building (parallel)...")
    # Run both in parallel using threads
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=2) as ex:
        fe_future = ex.submit(frontend_agent.run, f"PRD:\n{prd}")
        be_future = ex.submit(backend_agent.run,  f"PRD:\n{prd}")
    frontend_code = fe_future.result()
    backend_code  = be_future.result()
    save("frontend_code.md", frontend_code)
    save("backend_code.md",  backend_code)
    supervisor.run(f"[FRONTEND_OUTPUT]\n{frontend_code}")
    supervisor.run(f"[BACKEND_OUTPUT]\n{backend_code}")

    print("\n[5/6] Tester agent writing tests...")
    tests = tester_agent.run(
        f"PRD:\n{prd}\n\nFrontend:\n{frontend_code}\n\nBackend:\n{backend_code}"
    )
    save("tests.md", tests)
    supervisor.run(f"[TEST_OUTPUT]\n{tests}")

    print("\n[6/6] Supervisor writing final summary...")
    summary = supervisor.run(
        "All stages complete. Write a final summary: what was built, "
        "file list, how to run the project, and any known gaps."
    )
    save("summary.md", summary)

    print("\nDone. Check the output/ folder.")
    return summary