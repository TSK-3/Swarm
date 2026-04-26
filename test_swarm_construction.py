#!/usr/bin/env python
import traceback

print("Testing swarm imports...")
try:
    print("1. import os")
    import os
    
    print("2. from agents.orch import make_supervisor")
    from agents.orch import make_supervisor
    
    print("3. from agents.idea import make_idea_agent")
    from agents.idea import make_idea_agent
    
    print("4. from agents.res import make_research_agent")
    from agents.res import make_research_agent
    
    print("5. from agents.prd import make_prd_agent")
    from agents.prd import make_prd_agent
    
    print("6. from agents.front import make_frontend_agent")
    from agents.front import make_frontend_agent
    
    print("7. from agents.back import make_backend_agent")
    from agents.back import make_backend_agent
    
    print("8. from agents.test import make_tester_agent")
    from agents.test import make_tester_agent
    
    print("All imports successful!")
    
    # Now try to create a simple version of swarm
    print("\nTesting swarm creation...")
    os.makedirs("output", exist_ok=True)
    
    def save(filename: str, content: str):
        with open(f"output/{filename}", "w") as f:
            f.write(content)
        print(f"  Saved → output/{filename}")
    
    def run_swarm(idea: str):
        print(f"Starting swarm with idea: {idea}")
        return "Done"
    
    print("run_swarm function created successfully!")
    
except Exception as e:
    print(f"ERROR: {e}")
    traceback.print_exc()
