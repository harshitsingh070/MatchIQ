import importlib.util
import os
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "main.py"

spec = importlib.util.spec_from_file_location("rag_main", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class LLMProviderTests(unittest.TestCase):
    def setUp(self):
        os.environ.pop("LLM_PROVIDER", None)
        os.environ.pop("GROQ_API_KEY", None)

    def test_provider_defaults_to_openrouter_when_groq_missing(self):
        self.assertEqual(module.get_active_provider(), "openrouter")

    def test_provider_selects_groq_when_configured(self):
        os.environ["LLM_PROVIDER"] = "groq"
        os.environ["GROQ_API_KEY"] = "test-groq-key"
        self.assertEqual(module.get_active_provider(), "groq")


if __name__ == "__main__":
    unittest.main()
