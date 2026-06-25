# Alumni Meet 2026 — Registration Website

A complete alumni meet registration system with food token generation, QR codes, and Google Sheets integration.

## 🌟 Features
- Multi-step registration form with validation
- Google Sheets data storage
- Automated food token generation (format: `ALMN-VEG-YYYYMMDD-XXXXX-P1`)
- QR code in confirmation email (generated locally, no external API)
- HTML confirmation email with food + registration details
- Responsive dark-themed UI

## 📁 Project Structure
```
alumni-meet/
├── index.html              # Main registration website
├── style.css               # Dark theme styling
├── script.js               # Form logic & Google Sheets integration
└── google-apps-script/
    ├── Code.gs             # Apps Script backend (registration + email)
    └── QRCode.gs           # Pure JS QR code generator (no external API)
```

## 🚀 Setup Instructions

### 1. Google Sheets + Apps Script
1. Create a Google Sheet named `Alumni Meet 2026`
2. Go to **Extensions → Apps Script**
3. Create two script files:
   - `Code.gs` — paste contents of `google-apps-script/Code.gs`
   - `QRCode.gs` — click ➕, name it `QRCode`, paste contents of `google-apps-script/QRCode.gs`
4. Save and go to **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the Web App URL

### 2. Frontend
1. Open `script.js`
2. Replace the `APPS_SCRIPT_URL` on line 2 with your Web App URL
3. Open `index.html` in a browser or serve with `npx serve`

### 3. Run locally
```bash
npx -y serve -l 3000
```
Then open [http://localhost:3000](http://localhost:3000)

## 🎫 Food Token Format
```
ALMN-VEG-20260625-A7K2M-P2
      │        │      │   └─ Person count
      │        │      └───── Random 5-char code
      │        └──────────── Date (YYYYMMDD)
      └───────────────────── Food type (VEG/NVEG/MIX)
```

## 📧 Email Confirmation
Each registrant receives:
- Food token code
- QR code (scannable at food counter)
- Registration summary
- Event details

## 🛠 Tech Stack
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **Email**: Gmail via MailApp (Apps Script)
- **QR Code**: Pure JavaScript (no external API)
