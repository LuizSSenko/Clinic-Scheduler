"use server"

import type { Appointment } from "./types"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

// Mailgun API key from your environment variables
const MAILGUN_API_KEY = "0976bffc6bf053d33de9232fbb8b6031-e71583bb-54547a9d"
const MAILGUN_DOMAIN = "sandboxff91bb118e44489189aa415e8c24f0e2.mailgun.org"
const MAILGUN_FROM = "Clinic Scheduler <postmaster@sandboxff91bb118e44489189aa415e8c24f0e2.mailgun.org>"

interface EmailTemplates {
  subject: {
    en: string
    "pt-BR": string
  }
  body: {
    en: (appointment: Appointment) => string
    "pt-BR": (appointment: Appointment) => string
  }
}

// Email templates for different languages
const appointmentConfirmationTemplates: EmailTemplates = {
  subject: {
    en: "Your Appointment Confirmation",
    "pt-BR": "Confirmação da Sua Consulta",
  },
  body: {
    en: (appointment: Appointment) => {
      try {
        const dateObj = parseISO(appointment.date)
        const formattedDate = format(dateObj, "MMMM d, yyyy")

        return `
Dear ${appointment.userName},

Thank you for scheduling an appointment with our clinic.

Appointment Details:
- Date: ${formattedDate}
- Time: ${appointment.time}
${appointment.isEmergency ? "- This is marked as an EMERGENCY appointment" : ""}

Please arrive 15 minutes before your scheduled time. If you need to reschedule or cancel your appointment, please contact us as soon as possible.

Best regards,
Clinic Scheduler Team
        `
      } catch (error) {
        console.error("Error formatting date for email:", error)
        return `
Dear ${appointment.userName},

Thank you for scheduling an appointment with our clinic.

Appointment Details:
- Date: ${appointment.date}
- Time: ${appointment.time}
${appointment.isEmergency ? "- This is marked as an EMERGENCY appointment" : ""}

Please arrive 15 minutes before your scheduled time. If you need to reschedule or cancel your appointment, please contact us as soon as possible.

Best regards,
Clinic Scheduler Team
        `
      }
    },
    "pt-BR": (appointment: Appointment) => {
      try {
        const dateObj = parseISO(appointment.date)
        const formattedDate = format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: ptBR })

        return `
Prezado(a) ${appointment.userName},

Obrigado por agendar uma consulta em nossa clínica.

Detalhes da Consulta:
- Data: ${formattedDate}
- Horário: ${appointment.time}
${appointment.isEmergency ? "- Esta consulta está marcada como EMERGÊNCIA" : ""}

Por favor, chegue 15 minutos antes do horário agendado. Se precisar remarcar ou cancelar sua consulta, entre em contato conosco o mais breve possível.

Atenciosamente,
Equipe da Clínica
        `
      } catch (error) {
        console.error("Error formatting date for email:", error)
        return `
Prezado(a) ${appointment.userName},

Obrigado por agendar uma consulta em nossa clínica.

Detalhes da Consulta:
- Data: ${appointment.date}
- Horário: ${appointment.time}
${appointment.isEmergency ? "- Esta consulta está marcada como EMERGÊNCIA" : ""}

Por favor, chegue 15 minutos antes do horário agendado. Se precisar remarcar ou cancelar sua consulta, entre em contato conosco o mais breve possível.

Atenciosamente,
Equipe da Clínica
        `
      }
    },
  },
}

/**
 * Sends a confirmation email to the user after booking an appointment
 */
export async function sendAppointmentConfirmationEmail(appointment: Appointment, language: "en" | "pt-BR" = "en") {
  try {
    console.log(`Sending confirmation email to ${appointment.userEmail}`)

    const subject = appointmentConfirmationTemplates.subject[language]
    const body = appointmentConfirmationTemplates.body[language](appointment)

    const formData = new URLSearchParams()
    formData.append("from", MAILGUN_FROM)
    formData.append("to", `${appointment.userName} <${appointment.userEmail}>`)
    formData.append("subject", subject)
    formData.append("text", body)

    const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Mailgun API error:", errorData)
      return { success: false, message: `Failed to send email: ${errorData}` }
    }

    const data = await response.json()
    console.log("Email sent successfully:", data)
    return { success: true, message: "Email sent successfully" }
  } catch (error) {
    console.error("Error sending confirmation email:", error)
    return { success: false, message: `Error sending email: ${error.message}` }
  }
}
