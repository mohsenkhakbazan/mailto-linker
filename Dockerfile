FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json /app/package.json
RUN npm install --omit=dev

# Copy app
COPY backend /app/backend
COPY frontend /app/frontend

# Create data dir for sqlite
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "backend/src/index.js"]
