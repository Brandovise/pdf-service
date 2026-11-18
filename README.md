# Apna PDF Service

Ek API jo HTML ya template se PDF banati hai. Isse n8n, Zoho Deluge, Postman, website, kahin se bhi call kar sakte ho. Koi limit nahi hai.

## Endpoints

| Method | URL | Kaam |
|---|---|---|
| GET | `/health` | Service chal rahi hai ya nahi |
| GET | `/templates` | Kaun se templates available hain |
| POST | `/pdf` | PDF banao |

Har request par header `x-api-key: <aapki key>` chahiye (sirf `/health` par nahi).

## POST /pdf: body (JSON)

```json
{
  "template": "default",
  "data": { "title": "Ticket Report", "content": "<p>Text</p>", "date": "17 Nov 2026" },
  "filename": "ticket-101.pdf",
  "output": "file",
  "options": { "format": "A4", "landscape": false, "margin": "15mm" }
}
```

- `template` + `data` ki jagah seedha `"html": "<h1>...</h1>"` bhi bhej sakte ho.
- `output: "file"` hone par response PDF file hota hai. `output: "base64"` hone par JSON aata hai: `{ filename, base64 }`.
- Naya design chahiye? `templates/` folder mein `invoice.html` jaisi nayi file daalo (Handlebars `{{field}}` syntax), redeploy karo, phir `"template": "invoice"` bhejo.

## Deploy

**Option A: VPS / jis server par n8n chal raha hai (Docker)**
```bash
docker build -t pdf-service .
docker run -d --name pdf-service --restart always -p 3000:3000 -e API_KEY=apni-lambi-secret-key pdf-service
```

**Option B: Render.com / Railway (bina server ke)**
1. Ye folder GitHub repo mein push karo.
2. Render par: New → Web Service → repo select karo → Runtime = Docker.
3. Environment variable add karo: `API_KEY` = apni secret key.
4. Deploy karo. Jo URL milega (`https://pdf-service-xxxx.onrender.com`) wo aapka API hai.
   (Render ka free plan idle hone par so jata hai, isliye pehli request slow ho sakti hai. Regular use ke liye paid instance lo.)

## Use: n8n

HTTP Request node:
- Method: POST, URL: `https://<aapka-url>/pdf`
- Header: `x-api-key`
- Body: JSON (upar wala)
- Options → Response Format: **File**

Output binary seedha agle HTTP Request node mein Zoho Desk ko bhej do:
`POST https://desk.zoho.com/api/v1/tickets/{{ticketId}}/attachments`, form-data field `file`, header `orgId`.

## Use: Zoho Deluge (Desk / CRM / Creator)

```javascript
body = Map();
body.put("template", "default");
body.put("filename", "ticket-" + ticketId + ".pdf");
body.put("data", {"title": "Ticket " + ticketId, "content": "Details yahan"});

pdfFile = invokeurl
[
  url: "https://<aapka-url>/pdf"
  type: POST
  body: body.toString()
  headers: {"x-api-key": "apni-key", "Content-Type": "application/json"}
];
// pdfFile ab ek file hai, isko Desk attachment API mein bhej sakte ho
```

## Use: curl / koi bhi app

```bash
curl -X POST https://<aapka-url>/pdf \
  -H "x-api-key: apni-key" -H "Content-Type: application/json" \
  -d '{"html":"<h1>Hello</h1>","filename":"test.pdf"}' -o test.pdf
```
