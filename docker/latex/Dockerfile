FROM texlive/texlive:latest

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY compile_server.py .
RUN pip3 install --break-system-packages fastapi uvicorn

EXPOSE 8080
CMD ["python3", "compile_server.py"]
