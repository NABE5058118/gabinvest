FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir aiogram

COPY bot.py .

EXPOSE 8080

CMD ["python", "bot.py"]
