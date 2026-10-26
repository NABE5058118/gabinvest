"""HTTP client for backend API."""
import os
import aiohttp

BACKEND_URL = os.getenv('BACKEND_URL', 'https://gabinvest.cloud-ip.cc')


class BackendClient:
    def __init__(self, base_url: str = BACKEND_URL, bot_sync_secret: str | None = None):
        self.base_url = base_url.rstrip('/')
        self.bot_sync_secret = bot_sync_secret or os.getenv('BOT_SYNC_SECRET') or None
        self._session: aiohttp.ClientSession | None = None

    async def _get_session(self) -> aiohttp.ClientSession:
        # One reusable session keeps connections alive instead of a new one per call.
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def close(self):
        if self._session is not None and not self._session.closed:
            await self._session.close()

    async def _request(self, method: str, path: str, json: dict | None = None,
                       headers: dict | None = None, timeout: int = 10) -> dict:
        url = f"{self.base_url}{path}"
        session = await self._get_session()
        async with session.request(
            method,
            url,
            json=json,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=timeout),
        ) as resp:
            if resp.status >= 400:
                return {'_error': resp.status, '_text': await resp.text()}
            return await resp.json()

    async def post(self, path: str, json: dict, headers: dict | None = None, timeout: int = 10) -> dict:
        return await self._request('POST', path, json=json, headers=headers, timeout=timeout)

    async def get(self, path: str, headers: dict | None = None, timeout: int = 10) -> dict:
        return await self._request('GET', path, headers=headers, timeout=timeout)

    async def put(self, path: str, json: dict, headers: dict | None = None, timeout: int = 10) -> dict:
        return await self._request('PUT', path, json=json, headers=headers, timeout=timeout)

    async def record_first_touch(self, data: dict) -> dict:
        return await self.post('/api/attribution/first-touch', data)

    async def record_event(self, data: dict) -> dict:
        return await self.post('/api/audit', data)

    async def create_deal(self, data: dict) -> dict:
        return await self.post('/api/deals', data)

    async def change_deal_stage(self, deal_id: str, stage: str, note: str | None = None) -> dict:
        return await self.put(f'/api/deals/{deal_id}/stage', {'stage': stage, 'note': note})

    async def close_deal(self, deal_id: str) -> dict:
        return await self.post(f'/api/deals/{deal_id}/close', {})

    async def reserve_commission(self, deal_id: str, amount: int, payment_method: str | None = None, provider_ref: str | None = None) -> dict:
        return await self.post(f'/api/commissions/{deal_id}/reserve', {'amount': amount, 'paymentMethod': payment_method, 'providerRef': provider_ref})

    async def sync_user(self, tg_user) -> dict:
        headers = {}
        if self.bot_sync_secret:
            headers['x-bot-sync-secret'] = self.bot_sync_secret
        return await self.post('/api/auth/telegram/bot-sync', {
            'telegramId': tg_user.id,
            'firstName': tg_user.first_name or '',
            'lastName': tg_user.last_name or '',
            'username': tg_user.username or '',
            'languageCode': tg_user.language_code or '',
        }, headers=headers)

    async def get_subscribers(self, object_id: str) -> list:
        """Вернуть список подписчиков на новые объекты (telegramId)."""
        headers = {}
        if self.bot_sync_secret:
            headers['x-bot-sync-secret'] = self.bot_sync_secret
        result = await self.get(
            f'/api/admin/users/notify-subscribers',
            headers=headers,
            params={'objectId': object_id},
        )
        if isinstance(result, list):
            return result
        return []
