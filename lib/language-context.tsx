"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Language = "en" | "pt-BR"

type LanguageContextType = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// English translations
const enTranslations = {
  // Common
  "app.title": "Clinic Scheduler",

  // Navigation
  "nav.bookAppointment": "Book Appointment",
  "nav.admin": "Admin",

  // Book Appointment Page
  "bookAppointment.title": "Book an Appointment",
  "bookAppointment.name": "Name",
  "bookAppointment.email": "Email",
  "bookAppointment.date": "Date",
  "bookAppointment.date.placeholder": "Pick a date",
  "bookAppointment.date.description": "Select a weekday for your appointment.",
  "bookAppointment.time": "Time",
  "bookAppointment.time.placeholder": "Select a time slot",
  "bookAppointment.time.selectDateFirst": "Select a date first",
  "bookAppointment.time.loading": "Loading available times...",
  "bookAppointment.time.noAvailableSlotsTitle": "No Available Time Slots",
  "bookAppointment.time.noAvailableSlotsDescription":
    "There are no available time slots for the selected date. Please select another date or try again later.",
  "bookAppointment.time.noAvailableSlots": "No available time slots",
  "bookAppointment.time.unavailable": "Unavailable",
  "bookAppointment.time.lastSlot": "Last slot",
  "bookAppointment.time.fewSlotsLeft": "Few slots left",
  "bookAppointment.time.description": "Choose a time for your appointment.",
  "bookAppointment.isEmergency": "Is this an emergency?",
  "bookAppointment.isEmergency.description": "Toggle if this appointment is urgent",
  "bookAppointment.emergencyDetails": "Emergency Details",
  "bookAppointment.emergencyDetails.placeholder": "Please describe the emergency situation",
  "bookAppointment.emergencyDetails.description":
    "Provide details about your emergency so we can prioritize your appointment",
  "bookAppointment.submit": "Book Appointment",
  "bookAppointment.submitting": "Booking...",
  "bookAppointment.success.title": "Appointment Booked Successfully!",
  "bookAppointment.success.message": "Your appointment has been scheduled. You will receive a confirmation shortly.",
  "bookAppointment.success.newAppointment": "Book Another Appointment",
  "bookAppointment.success.emailConfirmation": "A confirmation email has been sent to your email address.",

  // Admin Dashboard
  "admin.title": "Admin Dashboard",
  "admin.tabs.appointments": "Appointments",
  "admin.tabs.settings": "Clinic Settings",

  // Appointments Tab
  "appointments.calendar": "Calendar",
  "appointments.clearSelection": "Clear Selection",
  "appointments.allAppointments": "All Appointments",
  "appointments.forDate": "Appointments for {date}",
  "appointments.filteredAppointments": "Filtered Appointments",
  "appointments.noAppointments": "No appointments found.",
  "appointments.noAppointmentsForDate": "No appointments found for the selected date.",
  "appointments.table.date": "Date",
  "appointments.table.time": "Time",
  "appointments.table.patient": "Patient",
  "appointments.table.email": "Email",
  "appointments.table.reason": "Reason",
  "appointments.table.status": "Status",
  "appointments.table.emergency": "Emergency",
  "appointments.table.actions": "Actions",
  "appointments.emergency.yes": "Yes",
  "appointments.emergency.no": "No",
  "appointments.reasonForVisit": "Reason for Visit:",
  "appointments.emergencyDetails": "Emergency Details:",
  "appointments.showDetails": "Show Details",
  "appointments.hideDetails": "Hide Details",
  "appointments.refresh": "Refresh",

  // Clinic Settings
  "settings.general": "General Settings",
  "settings.blockTime": "Block Time",
  "settings.blockedTimes": "Blocked Times",

  // Clinic Settings Form
  "settings.form.workingHours": "Working Hours",
  "settings.form.startTime": "Start Time",
  "settings.form.endTime": "End Time",
  "settings.form.lunchBreak": "Lunch Break",
  "settings.form.enableLunchBreak": "Enable Lunch Break",
  "settings.form.enableLunchBreak.description": "Block appointments during lunch hours",
  "settings.form.appointmentCapacity": "Appointment Capacity",
  "settings.form.maxConcurrentAppointments": "Maximum Concurrent Appointments",
  "settings.form.maxConcurrentAppointments.description":
    "Maximum number of appointments that can be scheduled at the same time slot",
  "settings.form.save": "Save Settings",
  "settings.form.saving": "Saving...",
  "settings.form.saveSettings": "Save Settings",

  // Block Time Form
  "blockTime.date": "Date",
  "blockTime.date.description": "Select a date to block.",
  "blockTime.startTime": "Start Time",
  "blockTime.endTime": "End Time",
  "blockTime.reason": "Reason",
  "blockTime.submit": "Block Time",
  "blockTime.submitting": "Blocking...",

  // Blocked Times List
  "blockedTimes.noBlockedTimes": "No blocked times found.",
  "blockedTimes.table.date": "Date",
  "blockedTimes.table.startTime": "Start Time",
  "blockedTimes.table.endTime": "End Time",
  "blockedTimes.table.reason": "Reason",
  "blockedTimes.table.actions": "Actions",

  // Delete Buttons
  "delete.appointment": "Delete appointment",
  "delete.blockedTime": "Delete blocked time",
  "delete.confirm": "Are you absolutely sure?",
  "delete.appointment.description":
    "This action cannot be undone. This will permanently delete the appointment from the system.",
  "delete.blockedTime.description":
    "This action cannot be undone. This will permanently delete the blocked time period from the system.",
  "delete.cancel": "Cancel",
  "delete.confirm.button": "Delete",
  "delete.deleting": "Deleting...",

  // Loading States
  "loading.appointments": "Loading appointments...",
  "loading.blockedTimes": "Loading blocked times...",
  "loading.settings": "Loading clinic settings...",
  "loading.form": "Loading appointment form...",
}

// Portuguese-BR translations
const ptBRTranslations = {
  // Common
  "app.title": "Agendamento Clínico",

  // Navigation
  "nav.bookAppointment": "Agendar Consulta",
  "nav.admin": "Administração",

  // Book Appointment Page
  "bookAppointment.title": "Marque um Horário",
  "bookAppointment.name": "Nome",
  "bookAppointment.email": "Email",
  "bookAppointment.date": "Data",
  "bookAppointment.date.placeholder": "Escolha uma data",
  "bookAppointment.date.description": "Selecione um dia da semana para sua consulta.",
  "bookAppointment.time": "Horário",
  "bookAppointment.time.placeholder": "Selecione um horário",
  "bookAppointment.time.selectDateFirst": "Selecione uma data primeiro",
  "bookAppointment.time.loading": "Carregando horários disponíveis...",
  "bookAppointment.time.noAvailableSlotsTitle": "Sem Horários Disponíveis",
  "bookAppointment.time.noAvailableSlotsDescription":
    "Não há horários disponíveis para a data selecionada. Por favor, selecione outra data ou tente novamente mais tarde.",
  "bookAppointment.time.noAvailableSlots": "Sem horários disponíveis",
  "bookAppointment.time.unavailable": "Indisponível",
  "bookAppointment.time.lastSlot": "Último horário",
  "bookAppointment.time.fewSlotsLeft": "Poucos horários restantes",
  "bookAppointment.time.description": "Escolha um horário para sua consulta.",
  "bookAppointment.isEmergency": "É uma emergência?",
  "bookAppointment.isEmergency.description": "Ative se esta consulta for urgente",
  "bookAppointment.emergencyDetails": "Detalhes da Emergência",
  "bookAppointment.emergencyDetails.placeholder": "Por favor, descreva a situação de emergência",
  "bookAppointment.emergencyDetails.description":
    "Forneça detalhes sobre sua emergência para que possamos priorizar seu agendamento",
  "bookAppointment.submit": "Agendar Consulta",
  "bookAppointment.submitting": "Agendando...",
  "bookAppointment.success.title": "Consulta Agendada com Sucesso!",
  "bookAppointment.success.message": "Sua consulta foi agendada. Você receberá uma confirmação em breve.",
  "bookAppointment.success.newAppointment": "Agendar Outra Consulta",
  "bookAppointment.success.emailConfirmation": "Um email de confirmação foi enviado para o seu endereço de email.",

  // Admin Dashboard
  "admin.title": "Painel Administrativo",
  "admin.tabs.appointments": "Consultas",
  "admin.tabs.settings": "Configurações da Clínica",

  // Appointments Tab
  "appointments.calendar": "Calendário",
  "appointments.clearSelection": "Limpar Seleção",
  "appointments.allAppointments": "Todas as Consultas",
  "appointments.forDate": "Consultas para {date}",
  "appointments.filteredAppointments": "Consultas Filtradas",
  "appointments.noAppointments": "Nenhuma consulta encontrada.",
  "appointments.noAppointmentsForDate": "Nenhuma consulta encontrada para a data selecionada.",
  "appointments.table.date": "Data",
  "appointments.table.time": "Horário",
  "appointments.table.patient": "Paciente",
  "appointments.table.email": "Email",
  "appointments.table.reason": "Motivo",
  "appointments.table.status": "Status",
  "appointments.table.emergency": "Emergência",
  "appointments.table.actions": "Ações",
  "appointments.emergency.yes": "Sim",
  "appointments.emergency.no": "Não",
  "appointments.reasonForVisit": "Motivo da Consulta:",
  "appointments.emergencyDetails": "Detalhes da Emergência:",
  "appointments.showDetails": "Mostrar Detalhes",
  "appointments.hideDetails": "Ocultar Detalhes",
  "appointments.refresh": "Atualizar",

  // Clinic Settings
  "settings.general": "Configurações Gerais",
  "settings.blockTime": "Bloquear Horário",
  "settings.blockedTimes": "Horários Bloqueados",

  // Clinic Settings Form
  "settings.form.workingHours": "Horário de Funcionamento",
  "settings.form.startTime": "Horário de Início",
  "settings.form.endTime": "Horário de Término",
  "settings.form.lunchBreak": "Intervalo para Almoço",
  "settings.form.enableLunchBreak": "Habilitar Intervalo para Almoço",
  "settings.form.enableLunchBreak.description": "Bloquear agendamentos durante o horário de almoço",
  "settings.form.appointmentCapacity": "Capacidade de Agendamento",
  "settings.form.maxConcurrentAppointments": "Máximo de Consultas Simultâneas",
  "settings.form.maxConcurrentAppointments.description":
    "Número máximo de consultas que podem ser agendadas no mesmo horário",
  "settings.form.save": "Salvar Configurações",
  "settings.form.saving": "Salvando...",
  "settings.form.saveSettings": "Salvar Configurações",

  // Block Time Form
  "blockTime.date": "Data",
  "blockTime.date.description": "Selecione uma data para bloquear.",
  "blockTime.startTime": "Horário de Início",
  "blockTime.endTime": "Horário de Término",
  "blockTime.reason": "Motivo",
  "blockTime.submit": "Bloquear Horário",
  "blockTime.submitting": "Bloqueando...",

  // Blocked Times List
  "blockedTimes.noBlockedTimes": "Nenhum horário bloqueado encontrado.",
  "blockedTimes.table.date": "Data",
  "blockedTimes.table.startTime": "Horário de Início",
  "blockedTimes.table.endTime": "Horário de Término",
  "blockedTimes.table.reason": "Motivo",
  "blockedTimes.table.actions": "Ações",

  // Delete Buttons
  "delete.appointment": "Excluir consulta",
  "delete.blockedTime": "Excluir horário bloqueado",
  "delete.confirm": "Você tem certeza absoluta?",
  "delete.appointment.description":
    "Esta ação não pode ser desfeita. Isso excluirá permanentemente a consulta do sistema.",
  "delete.blockedTime.description":
    "Esta ação não pode ser desfeita. Isso excluirá permanentemente o período de tempo bloqueado do sistema.",
  "delete.cancel": "Cancelar",
  "delete.confirm.button": "Excluir",
  "delete.deleting": "Excluindo...",

  // Loading States
  "loading.appointments": "Carregando consultas...",
  "loading.blockedTimes": "Carregando horários bloqueados...",
  "loading.settings": "Carregando configurações da clínica...",
  "loading.form": "Carregando formulário de agendamento...",
}

const translations = {
  en: enTranslations,
  "pt-BR": ptBRTranslations,
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")

  // Load language preference from localStorage on component mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "pt-BR")) {
      setLanguage(savedLanguage)
    }
  }, [])

  // Save language preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("language", language)
  }, [language])

  // Translation function
  const t = (key: string): string => {
    const currentTranslations = translations[language]
    return currentTranslations[key] || key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
