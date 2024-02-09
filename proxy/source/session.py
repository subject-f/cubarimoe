import aiohttp

class Session():
    session = None

    @classmethod
    def get_session(cls):
        if cls.session is None:
            cls.session = aiohttp.ClientSession()
        return cls.session

    @classmethod
    async def close(cls):
        await cls.session.close()