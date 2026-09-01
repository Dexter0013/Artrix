# AI Assistant Avatar Controller

Interactive avatar controller powered by [Rive](https://rive.app) and Vite + React. Drives the **Deer-Girl rig** (`public/20673-38905-deer-girl.riv`) through 5 expression states via button controls.

## Features

- **5 Expression States** — Idle, Smile, Surprise, Confused, Angry
- **State Machine Driven** — Buttons fire directly into the Rive `Main` state machine
- **Hover Override** — Active expressions block Rive's built-in canvas hover so states stay locked until changed
- **Clean Cropping** — Built-in artboard hover buttons are clipped from view via CSS overflow

## Rig Inputs

| Input | Type | Role |
| :--- | :--- | :--- |
| `Btn_Normal` | Number | Gates the idle state (`1` = locked idle, `0` = allow transitions) |
| `trigger_smile` | Trigger | Smile expression |
| `trigger_surprise` | Trigger | Surprise / thinking expression |
| `trigger_confusion` | Trigger | Confused expression |
| `trigger_angry` | Trigger | Angry / alert expression |

## Project Structure

```
src/
├── App.jsx                      # State machine wiring & input logic
├── index.css                    # Global styles & design tokens
├── main.jsx                     # React entry point
└── components/
    ├── AssistantStage.jsx       # Avatar viewport + hover blocker overlay
    └── MoodController.jsx       # 5 expression buttons
public/
└── 20673-38905-deer-girl.riv   # Rive animation file
```

## Running Locally

```bash
npm install
npm run dev
```

Visit `http://localhost:5173/`

## Build

```bash
npm run build
```

## Stack

- [Vite](https://vitejs.dev/) v8
- [React](https://react.dev/) v18
- [@rive-app/react-canvas](https://www.npmjs.com/package/@rive-app/react-canvas) v4+
