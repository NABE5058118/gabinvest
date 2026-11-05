FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY *.py .

RUN useradd -m -u 1001 appuser
USER appuser

EXPOSE 8080

CMD ["python", "app.py"]
