# Sibelga WhatsApp Rescheduling Demo

A mobile web demo simulating a WhatsApp conversation between a Sibelga customer and an AI agent for rescheduling a home charging station installation appointment.

## What it does

The demo walks through a realistic rescheduling flow:

1. The customer receives a WhatsApp notification reminding them of their upcoming technician visit
2. They open the chat and can request to reschedule
3. The agent offers 5 available time slots for the coming week
4. If none work, the customer can ask for the next week's availability
5. Once a slot is chosen, the appointment is confirmed with an email notification

## Features

- iOS-style lock screen with a WhatsApp notification banner
- Animated typing indicator between agent responses
- Real date-aware slot generation (skips weekends and Belgian public holidays)
- Fully interactive chat input

## Live demo

👉 https://pwillemot.github.io/sibelga-whatsapp-demo/

## Tech stack

Plain HTML, CSS, and JavaScript — no frameworks or dependencies. Deployed via GitHub Pages.
