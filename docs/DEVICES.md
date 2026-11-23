# Putting Home Hub on a screen

## iPad (on the bench)

1. Open the hub in **Safari** → Share → **Add to Home Screen**. Open it from
   the new icon (it runs full-screen).
2. Settings → Display & Brightness → **Auto-Lock: Never** while it's on the bench.
3. Settings → Accessibility → **Guided Access** on. In Home Hub, triple-click
   the side button → Start, so little hands stay in the app.
4. Allow the microphone the first time someone records a voice note.

## Lenovo Chromebook (on the bench)

1. Open the hub in Chrome → ⋮ → **Cast, save and share → Install page as app**.
2. Settings → Device → Power → **When idle: keep display on** (while charging).
3. Open the app and press the full-screen key.

## 24" wall screen (Philips 242B9T + MINIX Z150-0dB), later

### The hardware

- The **Philips 242B9T** is just a monitor — no computer or browser inside.
  The picture comes from the mini PC over HDMI (or DisplayPort), and touch
  comes back to the PC over a USB cable.
- The **MINIX Z150-0dB** mini PC runs Windows 11 + Chrome. It opens Home Hub
  full-screen in Chrome **kiosk mode** (no browser chrome or desktop) and
  starts itself on boot, including after a power cut. Because the wall screen
  is the same web app as the iPad/Chromebook, a Vercel deploy updates it
  automatically.
- Kitchen-friendly specs: **1920×1080** (the size Home Hub is designed and
  tested for), **10-point touch** (two kids can tap at once), an **IP54**
  splash/dust-resistant front, and **inbuilt speakers** for read-aloud, voice
  notes and the confetti sounds. The mini PC is fanless, so it's silent and
  doesn't pull dust in.
- Mounting: standard **VESA 100×100** — any cheap VESA bracket fits. The MINIX
  ships with a power adapter, HDMI cable, a VESA mount and two external
  antennas, so it can sit between the screen and the bracket out of sight.
  You'll need a nearby power point for both (or an electrician to hide the
  cables).
- NZ prices (PB Tech): screen ~$688.85 inc GST, MINIX 8GB ~$509.29 inc GST
  (8GB is plenty for one Chrome window) — roughly **$1,200 plus a bracket**.
- **Simpler alternative:** wall-mount an iPad or large tablet instead — cheaper
  and no separate box, but a much smaller screen and harder to keep always-on.

### Setup (when it arrives)

1. Windows: create a local user "kiosk" that signs in automatically.
2. Add a startup shortcut:
   `"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk https://YOUR-HUB-URL --noerrdialogs --disable-session-crashed-bubble`
3. Power settings: never sleep. The hub dims itself at night and shows a
   calm clock, and the screensaver plays family photos when idle.

## What the screen does on its own

- Goes back to Home after 2 minutes idle (not during dinnertime reflection).
- Family photo slideshow after 5 minutes idle (Parent → Photos).
- Dims from 8pm, night clock from 9pm, back to normal at 6am (adjustable).
- Keeps the screen awake while open (Settings → Keep the screen awake).
