FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir aiogram aiohttp aiohttp-socks

COPY bot.py .

RUN useradd -m -u 1001 appuser
USER appuser

EXPOSE 8080

CMD ["python", "bot.py"]
