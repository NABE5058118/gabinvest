"""Anti-bypass message filters for chat."""
import re
from typing import Tuple

PATTERNS = [
    (re.compile(r'\+?\d{10,15}'), 'phone'),
    (re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'), 'email'),
    (re.compile(r'https?://\S+'), 'link'),
    (re.compile(r't\.me/\S+'), 'telegram'),
    (re.compile(r'(whatsapp|viber|telegram|signal|skype|messenger|@[a-z0-9_]{5,})', re.I), 'messenger'),
    (re.compile(r'(vk\.com|facebook\.com|instagram\.com|ok\.ru|tiktok\.com|youtube\.com)', re.I), 'social'),
]

def check_message(body: str) -> Tuple[bool, str | None]:
    for pattern, reason in PATTERNS:
        if pattern.search(body):
            return True, reason
    return False, None

def is_allowed(body: str) -> bool:
    blocked, _ = check_message(body)
    return not blocked