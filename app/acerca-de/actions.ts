"use server";

import { Resend } from "resend";

const FROM_EMAIL = "onboarding@resend.dev";
const TO_EMAIL = "emmanuel.garcia.ds@gmail.com";

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function sendContactMessage(
  _prevState: ContactResult | null,
  formData: FormData
): Promise<ContactResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const msg = String(formData.get("msg") ?? "").trim();

  if (!name || !email || !msg) {
    return { ok: false, error: "Todos los campos son obligatorios." };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email,
      subject: `Nuevo mensaje de contacto de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\n${msg}`,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido al enviar el correo.";
    return { ok: false, error: message };
  }
}
