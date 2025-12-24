FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build args
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the Next.js app
RUN npm run build

# Prepare standalone build
# Explicitly create directories and copy contents to avoid ambiguity
RUN mkdir -p .next/standalone/public && cp -r public/* .next/standalone/public/
RUN mkdir -p .next/standalone/.next/static && cp -r .next/static/* .next/standalone/.next/static/

# Start server using standalone output
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Change to standalone directory so paths resolve correctly
WORKDIR /app/.next/standalone

CMD ["node", "server.js"]
