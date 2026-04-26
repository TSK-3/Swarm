#!/usr/bin/env python
import traceback

agents = [
    ('orch', 'from agents.orch import make_supervisor'),
    ('idea', 'from agents.idea import make_idea_agent'),
    ('res', 'from agents.res import make_research_agent'),
    ('prd', 'from agents.prd import make_prd_agent'),
    ('front', 'from agents.front import make_frontend_agent'),
    ('back', 'from agents.back import make_backend_agent'),
    ('test', 'from agents.test import make_tester_agent'),
]

for name, import_stmt in agents:
    try:
        exec(import_stmt)
        print(f"✓ {name} OK")
    except Exception as e:
        print(f"✗ {name} ERROR: {e}")
        traceback.print_exc()
        break

print("\nTrying to import swarm...")
try:
    import swarm
    print(f"swarm module contents: {dir(swarm)}")
except Exception as e:
    print(f"ERROR: {e}")
    traceback.print_exc()
