"""Merged Knova knowledge base — 97 topics across four domain files."""

from .kb_tech import KB_TECH
from .kb_engsci import KB_ENGSCI
from .kb_business import KB_BUSINESS
from .kb_life import KB_LIFE

KB = {}
for _part in (KB_TECH, KB_ENGSCI, KB_BUSINESS, KB_LIFE):
    for _topic, _entry in _part.items():
        if _topic in KB:
            raise ValueError(f"Duplicate topic in knowledge base: {_topic}")
        KB[_topic] = _entry

__all__ = ["KB"]
