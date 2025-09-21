// api/booking.js
const sendgrid = require('@sendgrid/mail');
const { google } = require('googleapis');

// SendGrid API kulcs
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, phone, email, service, price, start, end } = req.body;

    if (!name || !phone || !email || !start || !end) {
      return res.status(400).json({ error: 'Hiányzó mezők' });
    }

    // Google service account kulcs dekódolása
    const saJson = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
    );

    const jwtClient = new google.auth.JWT(
      saJson.client_email,
      null,
      saJson.private_key,
      ['https://www.googleapis.com/auth/calendar']
    );

    await jwtClient.authorize();
    const calendar = google.calendar({ version: 'v3', auth: jwtClient });

    // Google Calendar esemény
    const event = {
      summary: `${service} — ${name}`,
      description: `Foglalás:\nSzolgáltatás: ${service}\nVendég: ${name}\nTel: ${phone}\nÁr: ${price || 'egyeztetés alatt'}`,
      start: { dateTime: start },
      end: { dateTime: end },
      attendees: [{ email }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };

    // esemény létrehozása a naptárban
    const insertRes = await calendar.events.insert({
      calendarId: process.env.CALENDAR_ID,
      resource: event,
      sendUpdates: 'all'
    });

    // e-mailek összeállítása
    const from = process.env.EMAIL_FROM; // pl. 'noreply@domain.hu'
    const owner = process.env.OWNER_EMAIL; // fodrász e-mailje

    const guestMsg = {
      to: email,
      from,
      subject: `Foglalás visszaigazolás — ${service}`,
      html: `<p>Kedves ${name},</p>
             <p>Köszönjük a foglalást. Az időpont részletei:</p>
             <ul>
               <li><strong>Szolgáltatás:</strong> ${service}</li>
               <li><strong>Időpont:</strong> ${new Date(start).toLocaleString()}</li>
               <li><strong>Várható vége:</strong> ${new Date(end).toLocaleString()}</li>
               <li><strong>Ár:</strong> ${price || 'egyeztetés alatt'}</li>
             </ul>
             <p>Várunk szeretettel!</p>`
    };

    const ownerMsg = {
      to: owner,
      from,
      subject: `Új foglalás: ${name} — ${service}`,
      html: `<p>Új foglalás érkezett:</p>
             <ul>
               <li><strong>Név:</strong> ${name}</li>
               <li><strong>Telefon:</strong> ${phone}</li>
               <li><strong>E-mail:</strong> ${email}</li>
               <li><strong>Szolgáltatás:</strong> ${service}</li>
               <li><strong>Időpont:</strong> ${new Date(start).toLocaleString()}</li>
             </ul>
             <p>Google Calendar esemény ID: ${insertRes.data.id}</p>`
    };

    await Promise.all([
      sendgrid.send(guestMsg),
      sendgrid.send(ownerMsg)
    ]);

    return res.status(200).json({ ok: true, eventId: insertRes.data.id });
  } catch (err) {
    console.error('Booking error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
