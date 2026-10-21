# Communication taste
- Prefers tightly scoped outputs: "reply with ONLY the prompt in one code block" plus a short list of facts that could not be found; minimal surrounding prose. Confidence: 0.7
- Writes long structured specs with numbered parts and "copy these rules exactly" instructions, expecting the agent to follow the requested structure verbatim rather than paraphrase, reorder, or embellish. Confidence: 0.75
- Names the downstream executor model and its weaknesses in the brief (e.g. "write for Gemini, which is weak at vague instructions") — wants prompts targeted at a less capable implementer with exact paths, signatures, defaults, edge cases, and an open-questions section. Confidence: 0.7
- Uses STEP 1 / STEP 2 / STEP 3 sectioning with explicit phase transitions ("read the code", "write the prompt", "output") and expects each step to be completed in order before the next. Confidence: 0.7
- Prefers long, copy-paste-ready prompts to be delivered as a `.md` file in the repo (e.g. `docs/ARGON_PROMPT_01_<topic>.md`) instead of inline in chat, so the whole prompt can be selected and pasted into another tool in one action. Confidence: 0.65
- Expects such a file to contain one self-contained fenced block (the prompt verbatim) rather than prose sections mixed with the payload. Confidence: 0.6
