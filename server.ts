import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp as initializeClientApp } from "firebase/app";
import { 
  getFirestore as getClientFirestore, 
  collection as clientCollection, 
  getDocs as getClientDocs, 
  doc as clientDoc, 
  getDoc as getClientDoc, 
  setDoc as clientSetDoc, 
  addDoc as clientAddDoc, 
  updateDoc as clientUpdateDoc, 
  deleteDoc as clientDeleteDoc 
} from "firebase/firestore";
import { 
  getAuth as getClientAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Client App and Firestore
const clientApp = initializeClientApp(firebaseConfig);
const clientDb = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId)
  : getClientFirestore(clientApp);
const clientAuth = getClientAuth(clientApp);

// Authentication helper for the server
let isServerAuthenticated = false;
async function ensureAuthenticated() {
  if (isServerAuthenticated) return;
  const email = "admin@ericacostapsi.com.br";
  const password = "ServerAdminPasswordSecured100#";
  try {
    await signInWithEmailAndPassword(clientAuth, email, password);
    isServerAuthenticated = true;
    console.log("Server successfully authenticated to Firebase Auth as admin.");
  } catch (err: any) {
    console.log("Initial sign-in failed, attempting to register server admin user...", err.message);
    try {
      await createUserWithEmailAndPassword(clientAuth, email, password);
      isServerAuthenticated = true;
      console.log("Server admin user created and signed in successfully.");
    } catch (createErr: any) {
      console.error("Failed to authenticate server:", createErr.message);
    }
  }
}

// Custom wrapper object acting exactly like Firebase Admin Firestore SDK
const db = {
  collection(collectionName: string) {
    return {
      async get() {
        await ensureAuthenticated();
        const snap = await getClientDocs(clientCollection(clientDb, collectionName));
        return {
          docs: snap.docs.map(d => ({
            id: d.id,
            data() {
              return d.data();
            },
            exists: true
          }))
        };
      },
      async add(data: any) {
        await ensureAuthenticated();
        const ref = await clientAddDoc(clientCollection(clientDb, collectionName), data);
        return { id: ref.id };
      },
      doc(id: string) {
        return {
          async get() {
            await ensureAuthenticated();
            const d = await getClientDoc(clientDoc(clientDb, collectionName, id));
            return {
              id: d.id,
              exists: d.exists(),
              data() {
                return d.data();
              }
            };
          },
          async set(data: any) {
            await ensureAuthenticated();
            await clientSetDoc(clientDoc(clientDb, collectionName, id), data);
          },
          async update(data: any) {
            await ensureAuthenticated();
            await clientUpdateDoc(clientDoc(clientDb, collectionName, id), data);
          },
          async delete() {
            await ensureAuthenticated();
            await clientDeleteDoc(clientDoc(clientDb, collectionName, id));
          }
        };
      }
    };
  }
};

const app = express();
const PORT = 3000;

// Security Middleware: HTTPS redirection and strict security headers (CSP, HSTS, XSS, nosniff, frame-ancestors)
app.use((req, res, next) => {
  // Enforce HTTPS in production
  if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }

  // Security Headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  
  // Custom Content Security Policy supporting both internal assets, CDNs, and Google AI Studio framing
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' https: 'unsafe-inline' 'unsafe-eval' data: blob:; " +
    "img-src 'self' https: data: blob:; " +
    "media-src 'self' https: data: blob:; " +
    "connect-src 'self' https: wss:; " +
    "frame-src 'self' https:; " +
    "frame-ancestors 'self' https://*.google.com https://*.googleusercontent.com https://*.run.app https://ai.studio https://*.preview.googleusercontent.com https://*.web.app;"
  );

  next();
});

app.use(express.json());

// API routes go here FIRST

// 0. Proxy endpoint to fetch external PDFs without CORS issues
app.get("/api/proxy-pdf", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send("URL is required");
  }
  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") || "application/pdf";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err: any) {
    console.error("Error proxying PDF:", err);
    res.status(500).send(`Error fetching PDF: ${err.message}`);
  }
});

// 1. Book an appointment
function calculateCRC16Server(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    crc ^= (byte << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = (crc << 1);
      }
      crc &= 0xFFFF;
    }
  }
  let hex = crc.toString(16).toUpperCase();
  while (hex.length < 4) {
    hex = '0' + hex;
  }
  return hex;
}

function formatEMVFieldServer(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function cleanStringServer(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s*\-\.\@]/g, '')
    .toUpperCase();
}

function generatePixCodeServer(data: { key: string; name: string; city: string; amount?: number; description?: string; transactionId?: string; }): string {
  let payload = formatEMVFieldServer('00', '01');
  const gui = formatEMVFieldServer('00', 'br.gov.bcb.pix');
  const cleanKey = data.key.trim().replace(/\s+/g, '');
  const key = formatEMVFieldServer('01', cleanKey);
  let merchantInfoValue = `${gui}${key}`;
  if (data.description) {
    const cleanDesc = cleanStringServer(data.description).substring(0, 40);
    merchantInfoValue += formatEMVFieldServer('02', cleanDesc);
  }
  payload += formatEMVFieldServer('26', merchantInfoValue);
  payload += formatEMVFieldServer('52', '0000');
  payload += formatEMVFieldServer('53', '986');
  if (data.amount && data.amount > 0) {
    payload += formatEMVFieldServer('54', data.amount.toFixed(2));
  }
  payload += formatEMVFieldServer('58', 'BR');
  const cleanName = cleanStringServer(data.name).substring(0, 25);
  payload += formatEMVFieldServer('59', cleanName);
  const cleanCity = cleanStringServer(data.city).substring(0, 15);
  payload += formatEMVFieldServer('60', cleanCity);
  const rawTxId = data.transactionId || 'CON1';
  const txId = cleanStringServer(rawTxId).replace(/[^A-Z0-9]/g, '').substring(0, 25) || 'CON1';
  const additionalDataValue = formatEMVFieldServer('05', txId);
  payload += formatEMVFieldServer('62', additionalDataValue);
  payload += '6304';
  const checksum = calculateCRC16Server(payload);
  return `${payload}${checksum}`;
}

app.post("/api/appointments/book", async (req, res) => {
  try {
    const { serviceId, serviceTitle, patientName, patientEmail, patientPhone, date, timeSlot, amount, paymentMethod } = req.body;

    if (!serviceId || !patientName || !patientEmail || !patientPhone || !date || !timeSlot || !amount) {
      return res.status(400).json({ error: "Parâmetros obrigatórios ausentes." });
    }

    // Check if slot is already booked and confirmed
    const appQuery = await db.collection("appointments").get();
    const existing = appQuery.docs.find(doc => {
      const data = doc.data();
      return data.date === date && data.timeSlot === timeSlot && data.status === "confirmed";
    });

    if (existing) {
      return res.status(400).json({ error: "Este horário já foi preenchido por outro paciente." });
    }

    const appointmentId = "appt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    // Prepare payment credentials/mode
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const isRealMP = !!token && token.trim().length > 10;

    let paymentData: any = {
      type: "simulator",
      preferenceId: "",
      initPoint: "",
      qrCode: "",
      qrCodeBase64: ""
    };

    if (isRealMP && paymentMethod === "pix") {
      try {
        // Create Pix payment on Mercado Pago
        const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": appointmentId
          },
          body: JSON.stringify({
            transaction_amount: Number(amount),
            description: `Consulta Erica Costa - ${serviceTitle}`,
            payment_method_id: "pix",
            payer: {
              email: patientEmail,
              first_name: patientName.split(" ")[0],
              last_name: patientName.split(" ").slice(1).join(" ") || "Silva",
              phone: {
                area_code: "55",
                number: patientPhone.replace(/\D/g, "")
              }
            }
          })
        });

        const mpResult = await mpResponse.json();
        if (mpResponse.ok && mpResult.point_of_interaction?.transaction_data) {
          const tData = mpResult.point_of_interaction.transaction_data;
          paymentData = {
            type: "pix",
            paymentId: String(mpResult.id),
            qrCode: tData.qr_code,
            qrCodeBase64: tData.qr_code_base64
          };
        } else {
          console.warn("Mercado Pago Pix creation failed, falling back to simulation.", mpResult);
        }
      } catch (err) {
        console.error("Error creating real Mercado Pago Pix:", err);
      }
    } else if (isRealMP && paymentMethod === "credit_card") {
      try {
        // Create checkout preference on Mercado Pago
        const mpResponse = await fetch("https://api.mercadopago.com/v1/checkout/preferences", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            items: [
              {
                title: `Consulta Erica Costa - ${serviceTitle}`,
                quantity: 1,
                unit_price: Number(amount),
                currency_id: "BRL"
              }
            ],
            payer: {
              name: patientName,
              email: patientEmail,
              phone: {
                number: patientPhone
              }
            },
            back_urls: {
              success: `${process.env.APP_URL || "http://localhost:3000"}/?payment_status=success&appointment_id=${appointmentId}`,
              failure: `${process.env.APP_URL || "http://localhost:3000"}/?payment_status=failure&appointment_id=${appointmentId}`,
              pending: `${process.env.APP_URL || "http://localhost:3000"}/?payment_status=pending&appointment_id=${appointmentId}`
            },
            auto_return: "all"
          })
        });

        const mpResult = await mpResponse.json();
        if (mpResponse.ok && mpResult.id) {
          paymentData = {
            type: "credit_card",
            preferenceId: mpResult.id,
            initPoint: mpResult.init_point
          };
        } else {
          console.warn("Mercado Pago Preference creation failed, falling back to simulation.", mpResult);
        }
      } catch (err) {
        console.error("Error creating real Mercado Pago Preference:", err);
      }
    }

    // If still fallback simulator or created empty, generate dynamic credentials using PixConfig
    if (!paymentData.qrCode && paymentMethod === "pix") {
      let pixKey = "ericacostapsi@gmail.com";
      let pixName = "Erica Costa";
      let pixCity = "Fortaleza";
      
      try {
        const pixConfigDoc = await db.collection("pix_config").doc("default").get();
        if (pixConfigDoc.exists) {
          const pData = pixConfigDoc.data();
          if (pData && pData.key) {
            pixKey = pData.key;
            pixName = pData.receiverName || pixName;
            pixCity = pData.receiverCity || pixCity;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch custom Pix configuration, using default:", err);
      }

      const generatedPix = generatePixCodeServer({
        key: pixKey,
        name: pixName,
        city: pixCity,
        amount: Number(amount),
        description: `Consulta Erica Costa - ${serviceTitle}`,
        transactionId: appointmentId.replace(/[^A-Z0-9]/g, "").substring(0, 25)
      });

      paymentData = {
        type: "simulator",
        qrCode: generatedPix,
        qrCodeBase64: ""
      };
    } else if (!paymentData.initPoint && paymentMethod === "credit_card") {
      paymentData = {
        type: "simulator",
        initPoint: `${process.env.APP_URL || "http://localhost:3000"}/?simulate_checkout=true&appointment_id=${appointmentId}&amount=${amount}`
      };
    }

    const appointment = {
      id: appointmentId,
      serviceId,
      serviceTitle,
      patientName,
      patientEmail,
      patientPhone,
      date,
      timeSlot,
      amount: Number(amount),
      status: "pending_payment",
      createdAt: Date.now(),
      paymentType: paymentMethod,
      ...paymentData
    };

    // Save in Firestore
    await db.collection("appointments").doc(appointmentId).set(appointment);

    return res.json({ success: true, appointment });
  } catch (error: any) {
    console.error("Error creating booking:", error);
    return res.status(500).json({ error: error.message });
  }
});

// 2. Simulate Payment Confirm (to trigger successful hooks)
app.post("/api/appointments/simulate-payment", async (req, res) => {
  try {
    const { appointmentId, paymentType } = req.body;
    if (!appointmentId) {
      return res.status(400).json({ error: "appointmentId é obrigatório." });
    }

    const appRef = db.collection("appointments").doc(appointmentId);
    const snap = await appRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Agendamento não encontrado." });
    }

    const current = snap.data();
    await appRef.update({
      status: "confirmed",
      paymentType: paymentType || current.paymentType || "simulator",
      paidAt: Date.now()
    });

    return res.json({ success: true, message: "Pagamento confirmado com sucesso." });
  } catch (error: any) {
    console.error("Error in simulated payment confirmation:", error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. Get single appointment
app.get("/api/appointments/:id", async (req, res) => {
  try {
    const appRef = db.collection("appointments").doc(req.params.id);
    const snap = await appRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Agendamento não encontrado." });
    }
    return res.json(snap.data());
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Get all appointments (Admin)
app.get("/api/appointments", async (req, res) => {
  try {
    const snap = await db.collection("appointments").get();
    const list = snap.docs.map(d => d.data());
    // Sort descending by createdAt
    list.sort((a: any, b: any) => b.createdAt - a.createdAt);
    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Update appointment status (Admin)
app.put("/api/appointments/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status é obrigatório." });
    }
    const appRef = db.collection("appointments").doc(req.params.id);
    await appRef.update({ status });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Update appointment details (Reschedule or Cancel)
app.put("/api/appointments/:id", async (req, res) => {
  try {
    const { date, timeSlot, status } = req.body;
    const appRef = db.collection("appointments").doc(req.params.id);
    const updateData: any = {};
    if (date !== undefined) updateData.date = date;
    if (timeSlot !== undefined) updateData.timeSlot = timeSlot;
    if (status !== undefined) updateData.status = status;
    
    await appRef.update(updateData);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. Delete appointment (Admin)
app.delete("/api/appointments/:id", async (req, res) => {
  try {
    const appRef = db.collection("appointments").doc(req.params.id);
    await appRef.delete();
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 7. Available Exceptions/Blocked Slots config API
app.get("/api/blocked-slots", async (req, res) => {
  try {
    const snap = await db.collection("blocked_slots").get();
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/blocked-slots", async (req, res) => {
  try {
    const { date, timeSlot } = req.body;
    if (!date || !timeSlot) {
      return res.status(400).json({ error: "Data e horário são obrigatórios." });
    }
    const docRef = await db.collection("blocked_slots").add({ date, timeSlot, createdAt: Date.now() });
    return res.json({ success: true, id: docRef.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete("/api/blocked-slots/:id", async (req, res) => {
  try {
    const docRef = db.collection("blocked_slots").doc(req.params.id);
    await docRef.delete();
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Mercado Pago Webhook (IPN notification endpoint for production use)
app.post("/api/webhook/mercadopago", async (req, res) => {
  try {
    const { action, data, type } = req.body;
    // Process standard Mercado Pago payment confirmation
    if ((action === "payment.created" || action === "payment.updated" || type === "payment") && data?.id) {
      const paymentId = data.id;
      const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (mpResponse.ok) {
        const paymentInfo = await mpResponse.json();
        if (paymentInfo.status === "approved") {
          // Identify appointment by reference or description metadata or search
          const snap = await db.collection("appointments").get();
          const appt = snap.docs.find(d => {
            const val = d.data();
            // Preference ID match or description match
            return val.preferenceId === paymentInfo.preference_id || val.paymentId === String(paymentId);
          });
          
          if (appt) {
            await db.collection("appointments").doc(appt.id).update({
              status: "confirmed",
              paidAt: Date.now(),
              paymentId: String(paymentId)
            });
            console.log(`Appointment ${appt.id} successfully paid and confirmed via Mercado Pago Webhook.`);
          }
        }
      }
    }
    return res.status(200).send("OK");
  } catch (err: any) {
    console.error("Error in Mercado Pago Webhook handler:", err);
    return res.status(500).send(err.message);
  }
});

// Vite middleware setup and server listen bootstrap
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Fallback to index.html for SPA routes in dev mode
    app.get("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      try {
        const fs = await import("fs");
        let html = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap full-stack server:", err);
});
