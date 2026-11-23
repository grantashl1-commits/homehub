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

## 24" wall screen (Philips 242B9T + fanless mini PC), later

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
