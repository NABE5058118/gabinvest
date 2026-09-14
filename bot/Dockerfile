FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir aiogram aiohttp aiohttp-socks

COPY bot.py .

EXPOSE 8080

CMD ["python", "bot.py"]
