# Puppeteer ki official image - Chrome pehle se installed hai
FROM ghcr.io/puppeteer/puppeteer:25.18.0

ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /home/pptruser/app

COPY --chown=pptruser:pptruser package*.json ./
RUN npm ci --omit=dev

COPY --chown=pptruser:pptruser . .

EXPOSE 3000
CMD ["node", "server.js"]