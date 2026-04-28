"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LLM_MODEL = exports.DEFAULT_LLM_BASE_URL = void 0;
/** Defaults aligned with Ollama’s OpenAI-compatible API (`/v1/chat/completions` on port 11434). */
exports.DEFAULT_LLM_BASE_URL = "http://127.0.0.1:11434/v1";
/** Common tag; change in Settings to match `ollama list` (e.g. `llama3.2`, `mistral`, `qwen2.5:14b`). */
exports.DEFAULT_LLM_MODEL = "gemma4:26b";
