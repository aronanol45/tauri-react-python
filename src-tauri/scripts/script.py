import sys
import json

def main():
    raw = sys.stdin.read().strip()
    if raw:
        data = json.loads(raw)
        name = data.get("name", "World")
    else:
        name = "World"
    response = {"message": f"Hello, {name}! from python back-end"}
    print(json.dumps(response), flush=True)

if __name__ == "__main__":
    main()