FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for image processing (libmagic)
RUN apt-get update && apt-get install -y \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port 8000
EXPOSE 8000

# Command to run the application with hot reload, pointing to app/main.py
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Command to run the application using the entrypoint script
CMD ["./entrypoint.sh"]
