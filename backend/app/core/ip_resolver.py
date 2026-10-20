"""
Client IP address resolution with reverse-proxy trust boundary validation.

Prevents IP spoofing via arbitrary X-Forwarded-For headers while properly
resolving real client IPs when operating behind configured trusted proxies.
"""
from fastapi import Request
from app.core.config import get_settings


def get_client_ip(request: Request) -> str:
    """
    Safely resolves the true client IP address.

    Security rules:
    1. If request.client is None or empty, return "127.0.0.1".
    2. Direct remote address is request.client.host.
    3. If direct remote address is in settings.TRUSTED_PROXIES:
       - The request arrived through an authorized reverse proxy.
       - Parse X-Forwarded-For from right to left, stripping whitespace.
       - Skip any hops that are themselves in TRUSTED_PROXIES.
       - Return the first untrusted IP found (the authentic client).
       - If no untrusted IP is found or header is empty/invalid, return direct host.
    4. If direct remote address is NOT in settings.TRUSTED_PROXIES:
       - The connection came from an untrusted source.
       - DO NOT trust X-Forwarded-For; return direct remote host.
    """
    if not request.client or not request.client.host:
        return "127.0.0.1"

    direct_host = request.client.host.strip()
    settings = get_settings()
    trusted_proxies = set(getattr(settings, "TRUSTED_PROXIES", ["127.0.0.1", "::1"]))

    if direct_host not in trusted_proxies:
        # Direct untrusted connection: ignore any forwarded headers
        return direct_host

    # Behind trusted proxy: examine X-Forwarded-For
    forwarded_for = request.headers.get("x-forwarded-for")
    if not forwarded_for or not forwarded_for.strip():
        return direct_host

    hops = [hop.strip() for hop in forwarded_for.split(",") if hop.strip()]
    if not hops:
        return direct_host

    # Walk right-to-left: the client IP is the rightmost non-trusted hop
    for hop in reversed(hops):
        if hop not in trusted_proxies:
            return hop

    # If all hops were trusted proxies, return leftmost hop or direct host
    return hops[0] if hops else direct_host
