```text
 _   _ _____ ___  _   _
| \ | | ____/ _ \| \ | |
|  \| |  _|| | | |  \| |
| |\  | |__| |_| | |\  |
|_| \_|_____\___/|_| \_|

 _   _    _    ____  _  ___ _   _
| \ | |  / \  |  _ \| |/ /| \ | |
|  \| | / _ \ | |_) | ' / |  \| |
| |\  |/ ___ \|  __/| . \ | |\  |
|_| \_/_/   \_\_|   |_|\_\|_| \_|
```

<p align="center">
  <img src="https://img.shields.io/badge/iOS-Concepts-00E5FF?style=for-the-badge&logo=apple&logoColor=white" alt="iOS Concepts" />
  <img src="https://img.shields.io/badge/Web-Experiments-FF4FD8?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Web Experiments" />
  <img src="https://img.shields.io/badge/Utility%20%2F%20Chaos-50%20%2F%2050-39FF14?style=for-the-badge" alt="Utility and Chaos" />
  <img src="https://img.shields.io/badge/Late%20Night-Idea%20Lab-FFB000?style=for-the-badge" alt="Late Night Idea Lab" />
</p>

## A digital playground for apps that work hard and play stupid.

🌌 **Neon Napkin** is a sketchbook of iOS app concepts and web experiments.
Half of it is trying to be useful. Half of it is trying to make me laugh.
The result lives somewhere between product prototype, midnight side quest, and beautifully avoidable nonsense.

Some ideas are built to solve real problems:
finance tools, lightweight helpers, little systems that make life less annoying. 💸

Some ideas are built because the human spirit deserves better bad decisions:
musical toys, comedy apps, prank mechanics, interactive bits that absolutely did not need to exist. 🎸

And in the middle is the good stuff: quick experiments, weird interfaces, and proof-of-concepts that help decide whether an idea deserves a full build or should remain a glorious mistake. 🧪

## Repo Structure

For now, the repo intentionally has one project folder:

```text
neon-napkin/
├── comedy-writing-app/
├── init-neon-napkin.sh
└── README.md
```

Later on, more sibling folders can join the party for finance tools, utility builds, and other experiments.

## What's Inside

- 💸 Utility-first experiments for money, organization, and everyday shortcuts
- 🎸 Comedy-forward concepts, musical nonsense, and joke-powered interfaces
- 🌌 iOS-flavored app ideas with web side quests and playable prototypes
- 🧪 Fast tests of interactions, flows, and features before they become "real"

## Current Stack

This repo currently leans on:

- `Expo` and `React Native` for app concepts
- `React Native Web` for browser-friendly experiments
- `Firebase` for quick backend and hosting support
- plain old JavaScript when speed matters more than ceremony

## Local Setup

```bash
cd comedy-writing-app
npm install
npm start
```

If you want to branch into specific directions:

```bash
cd comedy-writing-app
npm run ios
npm run build:web
npm run deploy:web
```

## Working Rules

- Ship the useful thing
- Keep the weird thing
- Prototype fast
- Polish only what earns it
- Never kill a joke too early

## Why "Neon Napkin"?

Because some ideas start as serious product thinking, and some start as the kind of note you would write at 1:14 AM after way too much confidence and not enough sleep.
This repo respects both.

If you're here for practical tools, welcome.
If you're here for nonsense with suspicious production value, also welcome.
