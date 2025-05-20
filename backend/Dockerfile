# To Run Locally:
# > docker build -t smartbillingbackend:latest .
# > docker run -p 5001:5001 -e PORT=5001 -d smartbillingbackend:latest

# Base image
FROM python:3.12-slim

# Install Node.js and npm (NodeSource PPA for LTS version)
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Environment variables
ENV PORT=5001

# Instala dependencias del sistema, incluyendo Poppler
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Install poetry package manager
RUN pip install poetry

# Change the working directory to the root of the application
WORKDIR /app

# Copy the project
COPY . .

# Install dependencies
RUN npm install

# Expose the API port
EXPOSE ${PORT}

# Run the application
CMD ["npm", "start"]