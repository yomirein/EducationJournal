import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request

# In-process sliding window. It protects a single API process; behind several
# workers or instances a shared store (e.g. Redis) is needed instead.
_hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def rate_limit(limit: int, window_seconds: int):
    async def check(request: Request) -> None:
        client = request.client.host if request.client else "unknown"
        key = (request.url.path, client)
        now = time.monotonic()
        hits = _hits[key]
        while hits and now - hits[0] > window_seconds:
            hits.popleft()
        if len(hits) >= limit:
            raise HTTPException(
                429,
                "Too many requests, try again later",
                headers={"Retry-After": str(window_seconds)},
            )
        hits.append(now)

    return check
