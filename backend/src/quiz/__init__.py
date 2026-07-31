"""LLM-backed MCQ quiz generation.

`llm.py` talks to the providers, `prompts.py` holds the authoring prompt,
`service.py` validates + persists the questions as MCQ posts, and `tasks.py`
wraps it as a fire-and-forget background job triggered on topic creation.
"""
