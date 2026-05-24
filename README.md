# ⚛ QuantumLab — Electron Diffraction Simulator

A premium, interactive electron diffraction simulation built with vanilla HTML5, CSS3, and JavaScript. Visualize wave-particle duality, de Broglie wavelength, and Bragg's Law in real time.

![Status](https://img.shields.io/badge/status-ready-00f5ff) ![License](https://img.shields.io/badge/license-MIT-a855f7)

---

## ✨ Features

- **Real-time diffraction simulation** on HTML5 Canvas
- **Physics-accurate** calculations (de Broglie, Bragg's Law, relativistic corrections)
- **Interactive controls** — voltage, lattice spacing, Bragg angle, diffraction order, beam intensity
- **4 crystal structures** — FCC, BCC, SC, HCP
- **Live metrics dashboard** — wavelength, momentum, velocity, kinetic energy, Bragg status
- **Intensity & wavelength graphs** with real-time updates
- **Parameter sweep analysis** — voltage vs wavelength, Bragg angle vs order
- **Animated particle background** inspired by electron fields
- **Glassmorphism dark theme** with neon cyan/purple accents
- **Fully responsive** — desktop, tablet, mobile
- **Screenshot export** — save canvas as PNG
- **Theory section** — complete physics reference with formulas

## 🔬 Physics Principles

| Principle | Formula |
|---|---|
| de Broglie wavelength | `λ = h / √(2meV)` |
| Bragg's Law | `nλ = 2d·sin(θ)` |
| Electron momentum | `p = √(2meV)` |
| Kinetic energy | `KE = eV` |
| Electron velocity | `v = √(2eV/m)` |
| Relativistic correction | `λᵣ = h / √(2m₀eV(1 + eV/2m₀c²))` |

## 📸 Screenshots

> Open `electron_diffraction_experiment.html` in your browser to see the simulation in action.

## 🚀 Installation & Run

### Option 1 — Direct Open
```
Open electron_diffraction_experiment.html in any modern browser
```

### Option 2 — Python Server
```bash
cd electron
python -m http.server 8000
# Visit http://localhost:8000/electron_diffraction_experiment.html
```

### Option 3 — Node.js
```bash
npx serve .
```

### Option 4 — VS Code
Install "Live Server" extension → Right-click HTML → Open with Live Server

## 🌐 GitHub Pages Deployment

1. Create a new GitHub repository
2. Upload all files: `electron_diffraction_experiment.html`, `style.css`, `script.js`
3. Go to **Settings → Pages**
4. Select **Deploy from branch → main → / (root)**
5. Click **Save**
6. Your site will be live at: `https://username.github.io/repository-name/electron_diffraction_experiment.html`

## 📁 Project Structure

```
electron/
├── electron_diffraction_experiment.html   # Main HTML
├── style.css                              # Premium dark theme CSS
├── script.js                              # Physics simulation engine
└── README.md                              # This file
```

## 🛠 Technologies

- HTML5 Canvas
- Vanilla CSS3 (glassmorphism, gradients, animations)
- Vanilla JavaScript (no dependencies)
- Google Fonts (Inter, Poppins, JetBrains Mono)

## 📄 License

MIT — free for educational and portfolio use.
