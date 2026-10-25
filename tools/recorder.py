import json, os

LOG = os.environ.get("RECORD_LOG", "record.jsonl")


class RecorderMiddleware:
    """Scratch-only: append every JSON API response to a log for the demo fixtures."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        body = request.body.decode("utf-8", "replace") if request.method != "GET" else ""
        response = self.get_response(request)
        ctype = response.get("Content-Type", "")
        if request.path.startswith("/api/") and "json" in ctype and not getattr(response, "streaming", False):
            with open(LOG, "a") as fh:
                fh.write(json.dumps({
                    "method": request.method, "path": request.path, "query": request.META.get("QUERY_STRING", ""),
                    "status": response.status_code, "request": body[:4000],
                    "body": json.loads(response.content or b"null"),
                }) + "\n")
        return response
