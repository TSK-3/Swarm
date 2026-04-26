#!/usr/bin/env python
import traceback
import sys

print("Step-by-step import debugging...\n")

try:
    print("1. import os")
    import os
    print("   ✓")
    
    print("2. from agents.orch import make_supervisor")
    from agents.orch import make_supervisor
    print("   ✓")
    
    print("3. Calling os.makedirs('output', exist_ok=True)")
    os.makedirs("output", exist_ok=True)
    print("   ✓")
    
    print("4. Defining save function")
    def save(filename: str, content: str):
        with open(f"output/{filename}", "w") as f:
            f.write(content)
        print(f"  Saved → output/{filename}")
    print("   ✓")
    
    print("5. Defining run_swarm function")
    def run_swarm(idea: str):
        print(f"[run_swarm called with: {idea}]")
        return "Done"
    print("   ✓")
    
    print("\nNow trying to import swarm module...")
    import swarm as swarm_module
    print(f"Module imported. Checking for run_swarm...")
    
    if hasattr(swarm_module, 'run_swarm'):
        print("✓ run_swarm found!")
    else:
        print("✗ run_swarm NOT found")
        print(f"  Module contents: {dir(swarm_module)}")
        
        # Try to see if there's an error being suppressed
        print("\nTrying to reload and catch errors...")
        import importlib
        try:
            importlib.reload(swarm_module)
        except Exception as e:
            print(f"Error during reload: {e}")
            traceback.print_exc()
    
except Exception as e:
    print(f"\n✗ ERROR: {e}")
    traceback.print_exc()
