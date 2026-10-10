"""HTTP client for backend API."""
import os
import aiohttp

BACKEND_URL = os.getenv('BACKEND_URL', 'https://gabinvest.cloud-ip.cc')

class BackendClient:
    def __init__(self, base_url: str = BACKEND_URL):
        self.base_url = base_url.rstrip('/')

    async def post(self, path: str, json: dict, timeout: int = 10) -> dict:
        url = f"{self.base_url}{path}"
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=json, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                if resp.status >= 400:
                    return {'_error': resp.status, '_text': await resp.text()}
                return await resp.json()

    async def get(self, path: str, headers: dict | None = None, timeout: int = 10) -> dict:
        url = f"{self.base_url}{path}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                if resp.status >= 400:
                    return {'_error': resp.status}
                return await resp.json()

    async def put(self, path: str, json: dict, headers: dict | None = None, timeout: int = 10) -> dict:
        url = f"{self.base_url}{path}"
        async with aiohttp.ClientSession() as session:
            async with session.put(url, json=json, headers=headers, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                if resp.status >= 400:
                    return {'_error': resp.status}
                return await resp.json()

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
        return await self.post('/api/auth/telegram/bot-sync', {
            'telegramId': tg_user.id,
            'firstName': tg_user.first_name or '',
            'lastName': tg_user.last_name or '',
            'username': tg_user.username or '',
            'languageCode': tg_user.language_code or '',
        })