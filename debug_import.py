#!/usr/bin/env python
import sys
import traceback

try:
    print("Attempting to import swarm module...")
    import swarm
    print(f"Successfully imported swarm")
    print(f"swarm.__file__ = {swarm.__file__}")
    print(f"dir(swarm) = {dir(swarm)}")
    print(f"'run_swarm' in dir(swarm) = {'run_swarm' in dir(swarm)}")
    
    if hasattr(swarm, 'run_swarm'):
        print("run_swarm is accessible!")
    else:
        print("ERROR: run_swarm is NOT in swarm module")
        
except Exception as e:
    print(f"IMPORT ERROR: {e}")
    traceback.print_exc()
    sys.exit(1)
